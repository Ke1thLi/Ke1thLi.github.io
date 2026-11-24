# GitHub Pages 根站发布与迁移记录

正式源码和部署仓库均为 `Ke1thLi/ke1thli.github.io`，站点为 `https://ke1thli.github.io/`，Astro base 为 `/`。保留 `Ke1thLi/Ke1thLi-Blog` 的 MVP 历史和 `Ke1thLi/Ke1thLi-Blog-Pages` 仓库。旧 Hugo 源码仍保留在私有 `Ke1thLi/blog-source` 和独立归档中。

Phase E 的正式工作目录为 D:/04-Blog，使用根站仓库的 Git 历史。原 Hugo 工作树完整保存在 D:/09-Archive/Ke1thLi-Blog-Hugo-Worktree。

## 当前发布流程

1. **向根站仓库 `main` 推送或合并会触发正式发布。** 获得发布授权前，在本地或 PR 上验证。
2. **Validate and publish Pages** 对 push、PR 和手动运行执行锁定安装、类型检查、格式检查、测试及静态构建。根站 `main` 上的 push 或启用 `publish` 的手动运行会在验证成功后上传并发布 Pages Artifact。手动运行默认只做验证。
3. 发布任务使用本仓库的 `GITHUB_TOKEN` 和 OIDC，权限为 `contents: read`、`pages: write`、`id-token: write`。项目构建可从仓库变量 `BLOG_GITHUB_URL` 读取公开资料链接。
4. 发布后检查主页、文章路径、搜索、404、RSS、Sitemap、robots 和静态资源。

本地使用仓库锁定的 Node.js 和 npm，执行 `npm ci`、`npm run build` 和 `npm run preview`。开发模式使用 `npm run dev`，搜索索引由静态构建生成。

## Git 迁移记录

Astro 迁移从 MVP `a8317d4` 开始。集成提交 `42d3502` 以 Hugo 根站 `1e2f6b8` 为第一父提交、Astro 迁移提交为第二父提交。需要检查旧静态产物时，可读取第一父提交或迁移备份。

## 旧 URL 兼容

以归档生产 Sitemap 和产物文件树为准。保留 `/`、`/about/`、`/archives/`、`/categories/`、`/tags/` 和 `/sitemap.xml`。旧 `/index.xml` 保留为新 RSS 的兼容入口，主入口为 `/rss.xml`。`/404.html` 保留，Astro 提供 `/robots.txt` 和 `/favicon.png`。旧 favicon 位于 `/img/favicon.png`，需保留该旧地址时可添加静态兼容资源。旧产物包含 `.nojekyll`，未发现根级 `CNAME` 或 `robots.txt`。

| 旧路径                                                       | 新路径或处理方式                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `/post/`                                                     | 静态兼容页跳转到 `/articles/`                                                    |
| `/search/`                                                   | 打开现有搜索弹窗，并读取 Hugo 旧搜索表单的 `keyword` 查询参数                    |
| `/links/`                                                    | 暂无对应页，需确认保留独立链接页还是迁入 `/about/`                               |
| `/page/`、旧分页 `/page/N/`、`/post/page/N/` 和分类标签分页  | 根据实际内容与分页规则映射。不要将所有分页统一跳到首页                           |
| 旧文章资源、`/img/`、`/scss/`、`/ts/` 和 Hugo 生成的指纹资源 | 盘点外链，按需保留原路径的文章资源。Astro 使用自身静态资源，不复用 Hugo 主题代码 |

### 旧文章路径

下列路径是 Hugo 迁移前的文章地址。存在公开目标的地址由 [文章映射](../src/lib/legacy-posts.ts) 生成静态兼容页，包含目标链接和 Canonical。旧文章仍缺少公开目标时保留 404。静态兼容页的初始状态是 HTTP 200。启用 JavaScript 时跳转会保留查询和锚点。关闭 JavaScript 时仍可跳转或使用页面上的目标链接。需要 HTTP 301 时需另选支持该状态码的发布入口。

- `/p/ai-web-1.0-vulnhub靶场复现-重走来时路/`
- `/p/ai-web-2.0-vulunhub靶场复现-重走来时路4/`
- `/p/bossplayerctf-1-vulnhub靶场复现-重走来时路5/`
- `/p/bossplayerctf-1-vulnhub靶场复现-重走来时路7/`
- `/p/bottleneck-1-vulnhub靶场复现-重走来时路6/`
- `/p/buuctf-reverse-wp1/`
- `/p/ctfshow-reverse-wp1/`
- `/p/darkhole1.0-vulnhub靶场复现-重走来时路2/`
- `/p/darkhole2.0-vulnhub靶场复现/`
- `/p/dc-1-vulnhub靶场复现/`
- `/p/five86-1-vulnhub靶场复现/`
- `/p/necromancer-vulnhub靶场复现/`
- `/p/prime1-vulnhub靶场复现/`
- `/p/sickos1.2-vulnhub靶场复现/`
- `/p/skytower-vulnhub靶场复现-重走来时路3/`
- `/p/w1r3s-1.0.1-vulnhub靶场复现/`
- `/p/为什么这个时代我们更需要学-markdown-从语法入门到-obsidian-知识管理实践/`
- `/p/从零搭建个人技术博客为什么我选择了-hugo--github-pages以及为什么不用-hexoquartz-和图床/`
- `/p/算法笔记xorrc4-与-base64/`
- `/p/红日attck系列靶场一/`

### 旧标签路径

下列详情页等公开文章及标签确认后再验证。可移植标签在名称保持一致时沿用同一路径。中文标签的 Astro 路由使用编码后的 key，切换前需建立明确映射。

- `/tags/algo/`
- `/tags/ctf-reverse/`
- `/tags/markdown/`
- `/tags/obsidian/`
- `/tags/vulnhub/`
- `/tags/博客搭建/`
- `/tags/域渗透/`

## 恢复 Hugo

归档位于 `D:/09-Archive/Ke1thLi-Blog-Legacy-Backup/`。按 `RESTORE.md` 校验镜像和 SHA-256 清单，在本地预览 `deployment.tar` 中的 `1e2f6b8` 产物。获单独授权后，用正常后继提交将根站发布分支的文件树恢复为该提交的 Hugo 产物，保留两条历史。随后恢复根站 **Deploy from a branch → main → / (root)**、原有环境分支规则，并验证根站和旧文章路径。旧 Hugo 自动化是否重新开启由站点负责人单独决定。回滚不使用强推。
