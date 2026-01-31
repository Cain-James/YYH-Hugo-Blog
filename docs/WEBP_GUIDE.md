# WebP 图片支持使用指南

## 概述

项目现在支持 WebP 图片格式，可以显著减少图片文件大小并提升加载速度。

## 使用方法

### 1. 运行图片优化脚本

首先，运行我们提供的图片优化脚本来生成 WebP 版本：

```bash
# 安装必要工具（Ubuntu/WSL）
sudo apt-get install imagemagick optipng webp gifsicle

# 运行优化脚本
./scripts/optimize-images.sh
```

脚本会自动：
- 压缩原始图片
- 为每张图片生成 `.webp` 版本
- 备份原始文件到带时间戳的文件夹

### 2. 在模板中使用响应式图片

#### 方法 A：使用 Partial 模板（推荐）

```html
<!-- 基本用法 -->
{{- partial "responsive-image.html" (dict
  "src" "img/logo.png"
  "alt" "网站 Logo"
) }}

<!-- 完整参数 -->
{{- partial "responsive-image.html" (dict
  "src" "img/docker.png"
  "alt" "Docker 图标"
  "class" "tech-icon"
  "width" "100"
  "height" "100"
  "loading" "lazy"
) }}
```

#### 方法 B：直接使用 picture 标签

```html
<picture>
  <source srcset="/img/logo.webp" type="image/webp">
  <img src="/img/logo.png" alt="Logo" loading="lazy">
</picture>
```

### 3. 在 Markdown 中使用

对于 Markdown 文件，可以使用 Hugo 的 shortcode：

```markdown
<!-- 创建一个 shortcode: layouts/shortcodes/webp-img.html -->
{{< webp-img src="img/example.png" alt="示例图片" >}}
```

## 优化效果

### 文件大小对比

| 格式 | 典型压缩率 | 质量 |
|------|-----------|------|
| PNG 原始 | 100% | 无损 |
| PNG 优化 | 70-80% | 无损 |
| WebP | 25-35% | 近无损（quality=85） |

### 实际示例

```
logo.gif (972KB)
  ├─ logo.png (200KB)  ← 转换为PNG
  └─ logo.webp (60KB)  ← 节省 94%

docker.png (421KB)
  ├─ docker.png (336KB)  ← 优化后
  └─ docker.webp (105KB) ← 节省 75%
```

## 浏览器支持

WebP 格式被以下浏览器支持：
- ✅ Chrome 32+
- ✅ Firefox 65+
- ✅ Edge 18+
- ✅ Safari 14+ (macOS 11+)
- ✅ Opera 19+

不支持 WebP 的浏览器会自动回退到原始格式（PNG/JPG）。

## 最佳实践

### 1. 图片命名

保持原始格式和 WebP 版本的文件名一致：
```
static/img/
  ├─ logo.png
  ├─ logo.webp
  ├─ banner.jpg
  └─ banner.webp
```

### 2. 懒加载

对于首屏以外的图片，使用懒加载：

```html
{{- partial "responsive-image.html" (dict
  "src" "img/large-image.png"
  "alt" "大图"
  "loading" "lazy"
) }}
```

### 3. 关键图片预加载

对于 Logo 等关键图片，使用预加载：

```html
<!-- 在 extend_head.html 中 -->
<link rel="preload" as="image" type="image/webp" href="/img/logo.webp">
<link rel="preload" as="image" type="image/png" href="/img/logo.png">
```

### 4. 响应式图片

结合 srcset 实现不同尺寸：

```html
<picture>
  <source
    type="image/webp"
    srcset="/img/hero-small.webp 480w,
            /img/hero-medium.webp 768w,
            /img/hero-large.webp 1200w"
    sizes="(max-width: 768px) 100vw, 1200px"
  >
  <img src="/img/hero.jpg" alt="Hero Image" loading="lazy">
</picture>
```

## 常见问题

### Q: WebP 图片不显示怎么办？

A: 检查以下几点：
1. 确认 `.webp` 文件已生成并放在正确位置
2. 检查浏览器是否支持 WebP
3. 查看浏览器控制台是否有 CSP 错误
4. 确认文件路径正确

### Q: 需要手动创建 WebP 版本吗？

A: 不需要。运行 `./scripts/optimize-images.sh` 会自动生成所有图片的 WebP 版本。

### Q: 如何验证 WebP 是否生效？

A: 在浏览器开发者工具的 Network 面板中：
1. 刷新页面
2. 找到图片请求
3. 查看 Type 列，应该显示 `webp`
4. 查看文件大小，应该比原始格式小很多

### Q: 可以只使用 WebP 吗？

A: 不建议。为了兼容性，应该始终提供原始格式作为后备。

## 迁移现有图片

如果项目中已经有很多图片引用，可以批量替换：

```bash
# 1. 备份项目
git add .
git commit -m "备份：准备迁移到 WebP"

# 2. 生成 WebP 版本
./scripts/optimize-images.sh

# 3. 逐步替换模板中的 <img> 标签
# 可以使用 sed 或手动替换
```

## 性能提升预期

采用 WebP 后的预期改进：
- 📉 图片总大小减少 60-70%
- ⚡ 首次加载时间减少 30-40%
- 📱 移动设备流量节省 50-60%
- 🎯 Lighthouse 性能评分提升 10-15 分

## 相关文档

- [WebP 官方文档](https://developers.google.com/speed/webp)
- [Can I Use: WebP](https://caniuse.com/webp)
- [Hugo 图片处理](https://gohugo.io/content-management/image-processing/)

---

**更新时间**: 2026-01-31
