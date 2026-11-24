# Ke1thLi Blog

Ke1thLi 的个人技术博客，正式工作目录为 D:\04-Blog。站点使用 [Moonlit Folio 0.2.0](https://github.com/Ke1thLi/Moonlit-Folio) 通过真实内容验收的 Astro 模板。个人文章、站点配置和发布工作流由本站仓库维护，主题的开发和发布在独立主题仓库进行。模板代码沿用其许可证，文章及图片沿用其来源的权利状态。

## 本地开发

使用 Node.js 24.22.1 和 npm 11.19.1。

    npm ci
    npm run check
    npm run format:check
    npm test
    npm run build
    npm run preview -- --host 127.0.0.1 --port 4331

打开 [本地生产预览](http://127.0.0.1:4331/)。开发模式使用 npm run dev。静态产物位于 dist/，Pagefind 索引在构建阶段生成。发行站点地址、根路径和品牌配置见 [site.config.mjs](site.config.mjs)。

## 写作和发布

- [从 Obsidian 录入文章](docs/Obsidian-Writing.md)
- [GitHub Pages 发布与恢复](docs/Deployment.md)
- [主题开发与设计](docs/Development-Guide.md)
- [第三方声明](docs/Third-Party-Notices.md)

本地私稿目录 src/content/posts/_local-drafts/ 被 Git 和内容加载器排除，可保留与正式文章相同的 slug。新稿通过审核后再进入正式内容目录。格式检查跳过文章和项目 Markdown，保留作者的原文格式。
