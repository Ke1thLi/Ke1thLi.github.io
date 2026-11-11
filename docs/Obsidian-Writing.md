# 从 Obsidian 录入文章

继续在 Obsidian 中写作，准备发布时把 Markdown 和附件复制到博客。先在笔记中核对以下字段。

| 字段                     | 录入方式                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `title`、`description`   | 必填。摘要会出现在列表、搜索、RSS 和分享元信息中                                                                    |
| `slug`                   | 必填。小写字母、数字和单短横线，例如 `static-routing`。发布后保留原值                                               |
| `pubDate`、`updatedDate` | 发布时间必填，更新日期可选。加引号，例如 `"2026-11-11"`，或 `"2026-11-11T14:00:00+08:00"`。更新时间不得早于发布时间 |
| `category`、`type`       | 必填。各用一个小写短横线标识                                                                                        |
| `tags`                   | YAML 数组，可省略。含特殊符号时给标签加引号                                                                         |
| `projects`               | 可选 YAML 数组，值是已存在的项目文件名去掉 `.md`                                                                    |
| `draft`                  | 审稿时写 `true`，发布时改为 `false`。默认公开                                                                       |
| `lang`                   | 可选 BCP 47 标签。中文建议 `zh-CN`，省略时页面语言为 `en`                                                           |

1. 将文件复制到 `src/content/posts/`。保留 Obsidian 笔记中的草稿标记，先执行 `npm run check`。
2. 将图片复制到相对文章的资源目录，例如 `./assets/`。把 `![[capture.png]]` 写成标准 Markdown 图片语法，例如 `![图中内容](./assets/capture.png "图注")`。普通 Wiki 链接也要转换为 Markdown 链接，文章链接按发布 slug 处理。若发布在子路径下，避免从 `/` 开头写站内链接。
3. 普通代码块在围栏上指定语言，例如 `ts`。Mermaid 图表使用 `mermaid` 围栏。在静态预览里检查长代码、图片、表格和图表。
4. 审阅后将 `draft` 改为 `false`，运行 `npm run build` 和 `npm run preview`，确认文章、RSS、Sitemap 和搜索均能找到该条目。
5. 修改已发表内容时保留原 `slug` 和 `pubDate`，设置 `updatedDate` 后重新构建。

站点验收使用临时夹具，原始 Obsidian 笔记和正式集合由作者自行维护。

## 首篇真实文章发布检查

- [ ] 将候选稿保留在 `src/content/posts/_local-drafts/` 并设置 `draft: true`。这个目录被 Git 忽略，适合在源码仓库公开前保留未审阅的内容。
- [ ] 核对标题、摘要、语言、引用许可、个人信息、代码围栏及外链。检查 Obsidian 提示块和公式在普通 Markdown 中的呈现。候选稿如有附件，逐一检查路径和替代文字。
- [ ] 确认永久 slug 和分类，给 YAML 日期加引号，并核对标签数组。首次公开时确认 `pubDate` 的含义。后续更新保留 slug 和原发布时间，设置 `updatedDate`。
- [ ] 获得内容确认后，将稿件移到正式内容目录并改为 `draft: false`。在实际 Pages 前缀下检查正文、目录、代码复制、Mermaid 和图片，再检查 Canonical、RSS、Sitemap 和搜索。
