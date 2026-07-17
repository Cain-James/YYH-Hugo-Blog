#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

HOST="${BLOG_STUDIO_HOST:-127.0.0.1}"
PORT="${BLOG_STUDIO_PORT:-4177}"
SERVER="$REPO_ROOT/tools/blog-studio/server.mjs"
STATE_DIR="$REPO_ROOT/.blog-studio"
PID_FILE="$STATE_DIR/server.pid"
LOG_FILE="$STATE_DIR/server.log"
URL="http://$HOST:$PORT/"

usage() {
  cat <<'EOF'
用法:
  ./scripts/studio_manage.sh -start    启动本地博客工作台
  ./scripts/studio_manage.sh -stop     关闭本地博客工作台
  ./scripts/studio_manage.sh -status   查看运行状态
  ./scripts/studio_manage.sh -restart  重启本地博客工作台

可选环境变量:
  BLOG_STUDIO_HOST=127.0.0.1
  BLOG_STUDIO_PORT=4177
EOF
}

process_exists() {
  local pid="${1:-}"
  [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null
}

cmdline_matches_studio() {
  local pid="$1"
  local cmdline=""
  local cwd=""

  if [[ -r "/proc/$pid/cmdline" ]]; then
    cmdline="$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
  elif command -v ps >/dev/null 2>&1; then
    cmdline="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  fi

  [[ -n "$cmdline" ]] || return 1

  if [[ "$cmdline" == *"$SERVER"* ]]; then
    return 0
  fi

  # Relative command lines are accepted only when the process cwd is this repo.
  if [[ "$cmdline" == *"tools/blog-studio/server.mjs"* || "$cmdline" == *"blog-studio/server.mjs"* ]]; then
    if [[ -e "/proc/$pid/cwd" ]]; then
      cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    fi
    [[ "$cwd" == "$REPO_ROOT" || "$cmdline" == *"$REPO_ROOT"* ]]
    return
  fi

  return 1
}

read_pid_file() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(tr -cd '0-9' < "$PID_FILE" 2>/dev/null || true)"
  [[ -n "$pid" ]] || return 1
  echo "$pid"
}

discover_studio_pids() {
  local seen=" "
  local pid=""

  if pid="$(read_pid_file 2>/dev/null || true)"; then
    if process_exists "$pid" && cmdline_matches_studio "$pid"; then
      printf '%s\n' "$pid"
      seen="$seen$pid "
    fi
  fi

  if [[ -d /proc ]]; then
    local entry
    for entry in /proc/[0-9]*; do
      [[ -d "$entry" ]] || continue
      pid="${entry##*/}"
      [[ "$seen" == *" $pid "* ]] && continue
      if process_exists "$pid" && cmdline_matches_studio "$pid"; then
        printf '%s\n' "$pid"
        seen="$seen$pid "
      fi
    done
  elif command -v pgrep >/dev/null 2>&1; then
    while IFS= read -r pid; do
      [[ -n "$pid" && "$seen" != *" $pid "* ]] || continue
      if process_exists "$pid" && cmdline_matches_studio "$pid"; then
        printf '%s\n' "$pid"
        seen="$seen$pid "
      fi
    done < <(pgrep -f "tools/blog-studio/server.mjs" 2>/dev/null || true)
  fi
}

known_pids() {
  discover_studio_pids | sort -n | uniq
}

wait_for_server() {
  local timeout="${1:-8}"
  local deadline=$((SECONDS + timeout))

  while (( SECONDS < deadline )); do
    if command -v curl >/dev/null 2>&1; then
      if curl --silent --show-error --fail --noproxy '*' "$URL/api/config" >/dev/null 2>&1; then
        return 0
      fi
    elif command -v wget >/dev/null 2>&1; then
      if wget -q -O /dev/null "$URL/api/config" >/dev/null 2>&1; then
        return 0
      fi
    else
      sleep 1
      return 0
    fi
    sleep 0.25
  done

  return 1
}

write_pid_file() {
  local pid="$1"
  mkdir -p "$STATE_DIR"
  printf '%s\n' "$pid" > "$PID_FILE"
}

remove_pid_file() {
  rm -f "$PID_FILE"
}

start_studio() {
  if [[ ! -f "$SERVER" ]]; then
    echo "找不到 Blog Studio 服务文件: $SERVER" >&2
    return 1
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "未找到 node，请先安装 Node.js。" >&2
    return 1
  fi

  mkdir -p "$STATE_DIR"

  mapfile -t pids < <(known_pids)
  if (( ${#pids[@]} > 0 )); then
    write_pid_file "${pids[0]}"
    if wait_for_server 2; then
      echo "Blog Studio 已在运行: $URL"
    else
      echo "Blog Studio 进程已存在，但暂未响应: $URL"
      echo "PID: ${pids[*]}"
      echo "日志: ${LOG_FILE#$REPO_ROOT/}"
    fi
    return 0
  fi

  remove_pid_file
  {
    printf '\n[%s] starting Blog Studio on %s\n' "$(date -Is)" "$URL"
  } >> "$LOG_FILE"

  (
    cd "$REPO_ROOT"
    nohup env BLOG_STUDIO_HOST="$HOST" BLOG_STUDIO_PORT="$PORT" node "$SERVER" >> "$LOG_FILE" 2>&1 &
    printf '%s\n' "$!" > "$PID_FILE"
  )

  local pid
  pid="$(read_pid_file)"

  if wait_for_server 8; then
    echo "Blog Studio 已启动: $URL"
    echo "PID: $pid"
    echo "日志: ${LOG_FILE#$REPO_ROOT/}"
    return 0
  fi

  if process_exists "$pid"; then
    echo "Blog Studio 正在启动，但暂未响应: $URL"
    echo "PID: $pid"
    echo "日志: ${LOG_FILE#$REPO_ROOT/}"
    return 0
  fi

  remove_pid_file
  echo "Blog Studio 启动失败，请查看日志: ${LOG_FILE#$REPO_ROOT/}" >&2
  return 1
}

wait_until_stopped() {
  local timeout="${1:-5}"
  shift
  local pids=("$@")
  local deadline=$((SECONDS + timeout))
  local pid
  local alive

  while (( SECONDS < deadline )); do
    alive=0
    for pid in "${pids[@]}"; do
      if process_exists "$pid"; then
        alive=1
        break
      fi
    done
    (( alive == 0 )) && return 0
    sleep 0.2
  done

  return 1
}

stop_studio() {
  mapfile -t pids < <(known_pids)

  if (( ${#pids[@]} == 0 )); then
    remove_pid_file
    echo "Blog Studio 未在运行。"
    return 0
  fi

  local pid
  for pid in "${pids[@]}"; do
    kill -TERM "$pid" 2>/dev/null || true
  done

  if ! wait_until_stopped 5 "${pids[@]}"; then
    for pid in "${pids[@]}"; do
      kill -KILL "$pid" 2>/dev/null || true
    done
    wait_until_stopped 2 "${pids[@]}" || true
  fi

  remove_pid_file
  echo "Blog Studio 已关闭。"
}

status_studio() {
  mapfile -t pids < <(known_pids)

  if (( ${#pids[@]} == 0 )); then
    remove_pid_file
    echo "Blog Studio 未在运行。"
    return 0
  fi

  write_pid_file "${pids[0]}"
  echo "Blog Studio 正在运行。"
  echo "URL: $URL"
  echo "PID: ${pids[*]}"
  echo "日志: ${LOG_FILE#$REPO_ROOT/}"
}

case "${1:-}" in
  -start)
    start_studio
    ;;
  -stop)
    stop_studio
    ;;
  -status)
    status_studio
    ;;
  -restart)
    stop_studio
    start_studio
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
