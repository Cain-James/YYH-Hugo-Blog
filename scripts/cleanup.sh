#!/bin/bash
# 清理脚本 - 移除不应该被 git 跟踪和部署的文件

set -e

echo "===== 清理临时文件和错误的备份目录 ====="
echo ""

# 1. 清理 static/img 下的备份目录
echo "1. 清理 static/img 下的备份目录..."
if [ -d "static/img" ]; then
    find static/img -type d -name "backup_*" -exec rm -rf {} + 2>/dev/null || true
    echo "   ✓ 已删除 static/img/backup_* 目录"
else
    echo "   - static/img 目录不存在"
fi

# 2. 从 git 中移除 public 目录（如果被跟踪）
echo ""
echo "2. 从 git 中移除 public 目录..."
if git ls-files public/ | grep -q .; then
    git rm -r --cached public/ 2>/dev/null || true
    echo "   ✓ 已从 git 移除 public 目录"
else
    echo "   - public 目录未被 git 跟踪"
fi

# 3. 删除本地 public 目录
echo ""
echo "3. 删除本地 public 目录..."
if [ -d "public" ]; then
    rm -rf public
    echo "   ✓ 已删除本地 public 目录"
else
    echo "   - public 目录不存在"
fi

# 4. 检查 .gitignore
echo ""
echo "4. 检查 .gitignore 配置..."
if grep -q "^/public/$" .gitignore && grep -q "^.image-backups/$" .gitignore; then
    echo "   ✓ .gitignore 配置正确"
else
    echo "   ⚠ .gitignore 可能需要更新"
    echo "   建议包含："
    echo "     /public/"
    echo "     .image-backups/"
    echo "     static/img/backup_*/"
fi

echo ""
echo "===== 清理完成 ====="
echo ""
echo "建议下一步："
echo "1. 运行 'git status' 检查变更"
echo "2. 提交 .gitignore 的更新"
echo "3. 重新构建: 'hugo --gc --minify'"
echo ""
