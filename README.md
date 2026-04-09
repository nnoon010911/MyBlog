# Blog

这是一个以本地写作为优先的轻量博客库。

固定使用说明见 [WORKFLOW.md](WORKFLOW.md)。

适合你的用法：

- 现在：在本地实时写作、自动保存、只给自己看
- 以后：保留 `Markdown + frontmatter` 结构，方便迁移到 Astro 等静态博客

## 目录

- `Posts/`：已完成、可发布的文章
- `Drafts/`：草稿
- `Assets/`：文章配图、附件
- `Templates/`：写作模板
- `Home.md`：本地入口页

## 建议工作流

1. 临时想法先写到 `Drafts/`
2. 内容成型后移到 `Posts/`
3. 图片统一放到 `Assets/`
4. 每篇文章都保留 frontmatter，后续迁移更省事

## 一键发布

日常更新网页时，可以直接运行：

```powershell
cd F:\Projects\Blog
.\publish-blog.ps1
```

如果你想自定义提交信息：

```powershell
cd F:\Projects\Blog
.\publish-blog.ps1 -Message "docs(blog): 发布今日日记"
```

脚本会自动执行：

1. `git add .`
2. `git commit -m ...`
3. `git push origin main`

如果你懒得打开终端，也可以直接双击：

- `publish-blog.bat`

## 建议命名

- 草稿：`2026-04-09-主题草稿.md`
- 正式文章：`2026-04-09-主题.md`
- 图片目录：`Assets/文章slug/`

## 建议 frontmatter

```md
---
title: "文章标题"
date: "2026-04-09"
tags: ["标签1", "标签2"]
summary: "一句话摘要"
draft: true
slug: "article-slug"
---
```

## 迁移到公开博客时

以后如果你决定公开发布，优先推荐：

- `Astro`：最适合从这套结构迁移
- `Next.js`：更灵活，但比 Astro 重

迁移时通常只需要：

1. 保留 `Posts/` 里的 Markdown
2. 调整 frontmatter 字段
3. 把 `Assets/` 接到静态资源目录
