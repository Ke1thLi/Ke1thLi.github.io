# GitHub Pages 根站迁移与发布

正式源码和部署仓库均为 `Ke1thLi/ke1thli.github.io`，站点为 `https://ke1thli.github.io/`，Astro base 为 `/`。保留 `Ke1thLi/Ke1thLi-Blog` 的 MVP 历史和 `Ke1thLi/Ke1thLi-Blog-Pages` 仓库。旧 Hugo 源码仍保留在私有 `Ke1thLi/blog-source` 和独立归档中。

## Git 历史与切换顺序

1. 本地迁移提交以 Astro MVP `a8317d4` 为基础。集成提交以 Hugo 根站 `1e2f6b8` 为第一父提交、Astro 迁移提交为第二父提交，文件树采用完整的 Astro 工程。旧静态文件仍可从第一父提交或备份取回。
2. 在任何远程写入前，重新核对根站 `main` 和 Pages 设置。只在单独授权后推送集成分支并审查 PR。合并时保留提交图，避免 squash 或 rebase 丢失迁移父提交。
3. **旧 Pages 来源仍是 `main` 根目录。此时更新远程 `main` 可能触发旧发布机制。** 在获授权的切换窗口，先防止旧 Hugo 源码工作流继续向根站 `main` 推送，再将根站仓库 **Settings → Pages → Source** 切换到 **GitHub Actions**，确认切换后的站点状态，再合并迁移分支。核对 `github-pages` 环境仅允许 `main` 部署，并按需设置审批。
4. 确认 URL 兼容事项有明确处置方案后，从根站仓库 `main` 手动运行 **Validate and publish Pages** 并启用 `publish`。普通 push、PR 和 `publish=false` 运行验证和静态构建。正式手动运行额外上传官方 Pages Artifact，部署任务通过本仓库的 `GITHUB_TOKEN` 和 OIDC 发布，权限为 `contents: read`、`pages: write`、`id-token: write`。不需要 GitHub App、跨仓库 Variables 或 Secret。
5. 发布后检查主页、文章路径、搜索、404、RSS、Sitemap、robots 和静态资源。目标仓库不配置自定义域名。

本地使用仓库锁定的 Node.js 和 npm，执行 `npm ci`、`npm run build` 和 `npm run preview`。开发模式使用 `npm run dev`，搜索索引由静态构建生成。

## 旧 URL 兼容

以归档生产 Sitemap 和产物文件树为准。保留 `/`、`/about/`、`/archives/`、`/categories/`、`/tags/` 和 `/sitemap.xml`。旧 `/index.xml` 保留为新 RSS 的兼容入口，主入口为 `/rss.xml`。`/404.html` 保留，Astro 提供 `/robots.txt` 和 `/favicon.png`。旧 favicon 位于 `/img/favicon.png`，需保留该旧地址时可添加静态兼容资源。旧产物包含 `.nojekyll`，未发现根级 `CNAME` 或 `robots.txt`。

| 旧路径                                                       | 新路径或处理方式                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `/post/`                                                     | `/articles/`。切换前可提供静态兼容跳转                                           |
| `/search/`                                                   | 搜索使用站内弹窗。切换前可提供打开搜索的兼容入口                                 |
| `/links/`                                                    | 暂无对应页，需确认保留独立链接页还是迁入 `/about/`                               |
| `/page/`、旧分页 `/page/N/`、`/post/page/N/` 和分类标签分页  | 根据实际内容与分页规则映射。不要将所有分页统一跳到首页                           |
| 旧文章资源、`/img/`、`/scss/`、`/ts/` 和 Hugo 生成的指纹资源 | 盘点外链，按需保留原路径的文章资源。Astro 使用自身静态资源，不复用 Hugo 主题代码 |

### 旧文章路径

Astro 正式文章集合为空，下列路径在迁移构建中暂无对应页面。逐篇迁移时确认永久 Astro slug，记录 `/posts/{slug}/` 目标；文章和资源可用后，再为原路径生成静态兼容页，包含明确的跳转、链接及 Canonical。需要 HTTP 301 时另行评估支持 HTTP 重定向的入口。不要对尚未存在的目标创建跳转。

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
