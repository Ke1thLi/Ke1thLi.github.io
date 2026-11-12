# 从 Obsidian 发布到 Ke1thLi Blog

在 Obsidian 写作和预览 Markdown，在博客仓库保存最终发布版本。根站仓库是 `Ke1thLi/Ke1thLi.github.io`。推送 `main` 后，GitHub Actions 会运行检查、构建并发布，通过后才会更新线上页面。

## 1. 写作和准备附件

- 在 Obsidian 完成正文，用 Markdown 标题、代码围栏和标准链接。
- 发布前把 `[[文章名]]` 转成标准链接，例如 `[文章名](/posts/target-slug/)`。将 `![[screenshot.png]]` 改成 `![截图说明](./assets/screenshot.png)`。
- 将要发布的图片复制到文章目录下的 `assets/`。图片文件名尽量使用小写英文和连字符。
- 私人草稿留在 Obsidian。本地试写可放在博客的 `src/content/posts/_local-drafts/`，该目录被 Git 和文章加载器排除。

## 2. 把文章放进博客

在根站仓库的干净工作副本中新建 `src/content/posts/my-new-note/index.md`。目录名和 `slug` 建议一致。发布后地址为 `/posts/my-new-note/`。复制正文和附件，在 Markdown 顶部加入以下字段。

```yaml
---
title: "我的新文章"
description: "用一句话说明这篇文章讲什么。"
slug: my-new-note
pubDate: "2026-11-12"
type: note
tags: [Markdown, Obsidian]
lang: zh-CN
draft: false
---
```

日期改成实际发布日期。slug 和 type 使用小写英文、数字和单连字符，slug 在全站唯一。category 可以省略。想归入已有标签时，沿用原标签拼写和大小写。已发布文章的 slug 尽量固定，以保留链接。

## 3. 本地检查

首次在工作副本运行 `npm ci`。日常可用 `npm run dev` 预览正文。提交前运行以下命令，检查图片、文章目录、公式和链接。Pagefind 索引由生产构建生成，可在 `npm run preview` 中验证搜索。

```powershell
npx prettier --write src/content/posts/my-new-note/index.md
npm run check
npm run format:check
npm test
npm run build
npm run preview
```

## 4. 提交并发布

以下命令适用于从根站仓库克隆的工作副本。先运行 `git remote -v`，确认 `origin` 指向 `Ke1thLi/Ke1thLi.github.io`。如果 origin 仍指向旧的 `Ke1thLi-Blog` 源码仓库，请使用根站仓库的工作副本执行发布。

```powershell
git add -- src/content/posts/my-new-note/
git diff --cached --stat
git commit -m "docs: publish my new note"
git push origin main
```

如果你在功能分支写作，将该分支合入根站 `main` 即可。到根站仓库的 **Actions → Validate and publish Pages** 查看结果。成功后打开新文章地址，检查图片和搜索。失败时展开第一个红色步骤，修复后推送新提交。手动发布仍可使用 **Run workflow** 并勾选发布选项。
