# Ke1thLi Blog

面向长期写作与技术项目展示的个人博客，采用 Linear × Editorial 设计方向。Phase 1 以个人博客正式上线为目标。实际使用并打磨后，再抽离通用 Astro 主题。

- [项目概述与 PRD](PRD.md)
- [设计决策记录](Design-Decisions.md)
- [设计规范](Design-Guidelines.md)
- [技术架构](Architecture.md)
- [内容模型](Content-Model.md)
- [开源策略](Open-Source.md)
- [开发路线图](Roadmap.md)
- [测试与验收](Testing-and-Acceptance.md)

## 本地开发

维护人 Ke1thLi。使用 Node.js 24.22.1 和 npm 11.19.1。

```sh
npm ci
npm run dev
npm run check
npm run test:content
npm run test:routing
npm test
npm run format:check
npm run build
npm run preview
```

`npm run format` 格式化工程文件。静态产物位于 `dist/`，默认站点地址为 `https://ke1thli.github.io`，前缀为 `/`。本地构建与预览可使用 `BLOG_SITE_URL` 和 `BLOG_BASE_PATH` 覆盖默认值。

内容测试使用隔离的临时 Markdown 文件。文章 frontmatter 中的日期需加引号，例如 `pubDate: "2026-01-02"`，以便 schema 在 YAML 转换日期之前验证原始日期格式和有效性。项目 ID 取自 `src/content/projects/` 下的文件名，例如 `project-name.md` 对应 `project-name`。

Markdown 图片可使用相对于源文件的本地路径，例如 `./diagram.svg`，由 Astro 生成包含部署前缀的资源 URL。

运行 `npm run dev` 后可访问 `/design-system/` 检查排版和主题。设置部署前缀时，将同一前缀加到该路径前。预览路由仅由开发服务器注册。CSS tokens 位于 `src/styles/tokens.css`，容器在 `40rem` 增加页边距，预览在 `64rem` 切换为双栏。

公共布局在 `56rem` 起显示桌面侧栏，较窄时使用抽屉。可用 `BLOG_GITHUB_URL` 配置 GitHub 的 HTTP(S) 地址，用 `BLOG_RSS_URL` 覆盖页脚默认的站内 `rss.xml`。站内 RSS 路径随 `BLOG_BASE_PATH` 生成。GitHub 未配置时，页脚显示名称。字体通过 Google Fonts 按需加载，并提供本地系统回退。

文章列表每页 10 篇。分类和标签筛选生成独立静态 URL，可直接分享。文章阅读时间为估算值。Markdown 图片的可选 title 用作独立图片的图注，围栏语言 `mermaid` 用于图表。

Pagefind 在 `npm run build` 的最后一步仅索引公开文章详情。用同一环境执行 `npm run preview` 测试搜索，`npm run dev` 不生成索引。RSS 和 Sitemap 使用 `BLOG_SITE_URL` 生成绝对 URL。

发布和内容录入步骤见 [GitHub Pages 根站发布](docs/Deployment.md) 和 [Obsidian 录入文章](docs/Obsidian-Writing.md)。
