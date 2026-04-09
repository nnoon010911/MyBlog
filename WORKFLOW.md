# Blog Workflow

这份文档是这个博客的固定使用说明。以后维护博客时，优先按这里的流程走，不用再反复看脚本。

## 你平时只需要改什么

- 写正式内容：改 `Posts/*.md`
- 写未完成草稿：改 `Drafts/*.md`
- 放图片或附件：放到 `Assets/<slug>/`
- 改页面样式或详情页结构：改 `scripts/build-pages.mjs`

不要直接修改 `.site/`，因为它是每次构建都会重新生成的发布产物。

## 日常写一篇新日记

1. 复制模板 [Templates/post-template.md](Templates/post-template.md)
2. 新建文件到 `Posts/`，建议命名为 `YYYY-MM-DD-主题.md`
3. 填好 frontmatter
4. 写正文
5. 本地生成站点
6. 发布到 GitHub

示例 frontmatter：

```md
---
title: "2026-04-10 早晨的空白页"
date: "2026-04-10"
tags: ["日记", "想法"]
summary: "在还没被消息和安排填满之前，先留一点空白给自己。"
draft: false
slug: "2026-04-10-morning-note"
---
```

字段说明：

- `title`：文章标题
- `date`：发布日期，建议使用 `YYYY-MM-DD`
- `tags`：标签数组，可空
- `summary`：首页和详情页摘要
- `draft`：`false` 才会发布到站点
- `slug`：详情页链接名，尽量稳定，发布后不要频繁改

## 如果只是写草稿

1. 复制模板 [Templates/draft-template.md](Templates/draft-template.md)
2. 新建文件到 `Drafts/`
3. 保持 `draft: true`
4. 内容写成熟后，再移动到 `Posts/`

这样草稿不会出现在公开页面里。

## 图片怎么放

每篇文章单独建一个目录：

```text
Assets/
  2026-04-10-morning-note/
```

这样以后迁移到别的博客框架时也比较好整理。

## 本地生成页面

在仓库根目录运行：

```powershell
cd F:\Projects\Blog
node scripts/build-pages.mjs
```

它会重新生成 `.site/` 里的页面，包括：

- 首页
- 详情页
- `posts.json`
- `styles.css`

## 发布到 GitHub Pages

直接运行：

```powershell
cd F:\Projects\Blog
.\publish-blog.ps1
```

如果想自定义提交信息：

```powershell
cd F:\Projects\Blog
.\publish-blog.ps1 -Message "docs(blog): 发布 2026-04-10 日记"
```

这个脚本会自动执行：

1. `git add .`
2. `git commit -m "..."`
3. `git push origin main`

推送后，GitHub Pages 会自动重新部署。

## 什么时候该改脚本

只有在下面这些场景，才需要改 [scripts/build-pages.mjs](scripts/build-pages.mjs)：

- 想改首页卡片布局
- 想改详情页排版
- 想改全站颜色、边框、字体、间距
- 想调整 Markdown 渲染后的样式

如果你只是更新日记内容，不需要碰脚本。

## 最短固定流程

以后每次更新博客，按这个顺序做：

1. 在 `Posts/` 新建或修改一篇 `.md`
2. 检查 `title`、`date`、`summary`、`draft`、`slug`
3. 运行 `node scripts/build-pages.mjs`
4. 运行 `.\publish-blog.ps1`

## 常见错误

- 文章写好了但首页看不到：通常是 `draft: true`
- 改了 `.site/` 但下次又没了：因为 `.site/` 会被重新生成
- 详情页链接变了：通常是改了 `slug`
- 只改样式没生效：通常是忘了重新运行 `node scripts/build-pages.mjs`
