#!/bin/bash
# 图片优化脚本
# 用于压缩和优化博客中的图片文件

set -e

echo "===== 博客图片优化工具 ====="
echo ""

# 检查必要的工具
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 未安装"
        return 1
    else
        echo "✅ $1 已安装"
        return 0
    fi
}

echo "检查必要的工具..."
MISSING_TOOLS=0

check_tool "convert" || MISSING_TOOLS=$((MISSING_TOOLS+1))
check_tool "optipng" || MISSING_TOOLS=$((MISSING_TOOLS+1))
check_tool "cwebp" || MISSING_TOOLS=$((MISSING_TOOLS+1))
check_tool "gifsicle" || MISSING_TOOLS=$((MISSING_TOOLS+1))

echo ""

if [ $MISSING_TOOLS -gt 0 ]; then
    echo "需要安装以下工具："
    echo ""
    echo "Ubuntu/Debian:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install imagemagick optipng webp gifsicle"
    echo ""
    echo "macOS:"
    echo "  brew install imagemagick optipng webp gifsicle"
    echo ""
    exit 1
fi

# 创建备份目录（放在项目根目录，不会被发布）
BACKUP_DIR=".image-backups/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "开始优化图片..."
echo "原始文件将备份到: $BACKUP_DIR"
echo ""

# 优化 PNG 文件
echo "优化 PNG 文件..."
for img in static/img/*.png; do
    if [ -f "$img" ]; then
        filename=$(basename "$img")
        cp "$img" "$BACKUP_DIR/"

        # 使用 optipng 优化
        optipng -o7 -strip all "$img" 2>/dev/null || true

        # 创建 WebP 版本（更小）
        cwebp -q 85 "$img" -o "${img%.png}.webp" 2>/dev/null || true

        echo "  ✓ $filename"
    fi
done

# 优化 JPG 文件
echo "优化 JPG 文件..."
for img in static/img/*.jpg static/img/*.jpeg; do
    if [ -f "$img" ]; then
        filename=$(basename "$img")
        cp "$img" "$BACKUP_DIR/"

        # 使用 ImageMagick 优化
        convert "$img" -strip -quality 85 "$img.tmp" && mv "$img.tmp" "$img"

        # 创建 WebP 版本
        cwebp -q 85 "$img" -o "${img%.*}.webp" 2>/dev/null || true

        echo "  ✓ $filename"
    fi
done

# 优化 GIF 文件
echo "优化 GIF 文件..."
for img in static/img/*.gif; do
    if [ -f "$img" ]; then
        filename=$(basename "$img")
        cp "$img" "$BACKUP_DIR/"

        # 使用 gifsicle 优化
        gifsicle --optimize=3 --colors 256 "$img" -o "$img.tmp" && mv "$img.tmp" "$img"

        # 如果是 logo.gif，建议转换为 PNG
        if [[ "$filename" == "logo.gif" ]]; then
            # 提取第一帧转换为 PNG
            convert "$img[0]" -strip "${img%.gif}.png"
            # 创建 WebP 版本
            cwebp -q 90 "${img%.gif}.png" -o "${img%.gif}.webp"
            echo "  ✓ $filename (已创建 PNG 和 WebP 版本)"
        else
            echo "  ✓ $filename"
        fi
    fi
done

echo ""
echo "===== 优化完成 ====="
echo ""
echo "优化前后对比："
du -sh "$BACKUP_DIR" | awk '{print "备份大小: " $1}'
du -sh static/img/*.{png,jpg,jpeg,gif} 2>/dev/null | awk '{sum+=$1} END {print "当前大小: " sum}'
echo ""
echo "建议："
echo "1. 在 HTML 模板中使用 <picture> 标签支持 WebP"
echo "2. 如果网站正常，可以删除备份目录"
echo "3. 考虑使用 CDN 来进一步提升图片加载速度"
