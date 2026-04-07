# IconFont Generator 图标字体生成器

将SVG图标转换为网页图标字体（TTF、WOFF、WOFF2、EOT），并生成预览页面和CSS文件。

## 功能

- 自动读取`svg`目录下的SVG文件
- 生成多种字体格式：TTF、EOT、WOFF、WOFF2
- 生成CSS文件，包含完整的类名定义
- 生成HTML预览页面，支持点击复制CSS类名

## 使用方法

### 作为命令行工具使用

```bash
npx @gacfox/iconfont-generator -i <svg路径> -o <输出路径> 
```

### 作为工程使用

先克隆项目并安装依赖。

```bash
npm install
```

将你的SVG图片放入`svg`文件夹中，然后执行NodeJS程序。

```bash
node ./iconfont.js
```

结果会生成到`dist`目录。

## CSS使用示例

```html
<span class="icon-faGithub"></span>
<i class="icon-faEnvelope"></i>
```
