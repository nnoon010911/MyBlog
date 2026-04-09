import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync, cpSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'

const rootDir = resolve(process.cwd())
const postsDir = join(rootDir, 'Posts')
const assetsDir = join(rootDir, 'Assets')
const outDir = join(rootDir, '.site')

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, '\n')
}

function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, '').trim()
}

function toSlug(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseFrontmatter(raw) {
  const normalized = normalizeNewlines(raw)
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) {
    return { data: {}, content: normalized }
  }

  const [, block, content] = match
  const data = {}

  for (const line of block.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf(':')
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    data[key] = stripQuotes(value)
  }

  return { data, content }
}

function collectPosts() {
  if (!existsSync(postsDir)) {
    return []
  }

  return readdirSync(postsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md') && entry.name !== 'README.md')
    .map((entry) => {
      const sourcePath = join(postsDir, entry.name)
      const raw = readFileSync(sourcePath, 'utf8')
      const { data, content } = parseFrontmatter(raw)
      const baseName = basename(entry.name, '.md')
      const slug = toSlug(data.slug || baseName)
      const title = data.title || baseName
      const date = data.date || ''
      const summary = data.summary || ''
      const draft = String(data.draft || '').toLowerCase() === 'true'

      return {
        sourcePath,
        slug,
        title,
        date,
        summary,
        draft,
        content: content.trim(),
      }
    })
    .filter((post) => !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date))
}

function buildIndexHtml() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MyBlog</title>
    <meta name="description" content="一个轻量的个人博客与写作存档页。" />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="page">
      <header class="hero">
        <p class="eyebrow">MyBlog</p>
        <h1>写给现在的自己</h1>
        <p class="lead">这是一个从本地 Markdown 写作库自动生成的轻量页面。这里默认只展示 Posts 中的正式文章。</p>
      </header>
      <section>
        <div class="section-head">
          <h2>文章</h2>
          <span id="post-count" class="count">0 篇</span>
        </div>
        <div id="post-list" class="post-list"></div>
        <div id="empty-state" class="empty" hidden>暂时还没有公开文章。你可以继续在本地写 Drafts，准备好后再放入 Posts。</div>
      </section>
    </main>
    <script>
      async function main() {
        const response = await fetch('./posts.json');
        const posts = await response.json();
        const count = document.getElementById('post-count');
        const list = document.getElementById('post-list');
        const empty = document.getElementById('empty-state');

        count.textContent = posts.length + ' 篇';

        if (!posts.length) {
          empty.hidden = false;
          return;
        }

        list.innerHTML = posts.map((post) => \`
          <article class="card">
            <div class="meta">\${post.date || '未设置日期'}</div>
            <h3><a href="./post.html?slug=\${encodeURIComponent(post.slug)}">\${post.title}</a></h3>
            <p>\${post.summary || '这篇文章还没有填写摘要。'}</p>
          </article>
        \`).join('');
      }

      main().catch((error) => {
        const empty = document.getElementById('empty-state');
        empty.hidden = false;
        empty.textContent = '站点索引加载失败：' + error.message;
      });
    </script>
  </body>
</html>`
}

function buildPostHtml() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>文章 | MyBlog</title>
    <link rel="stylesheet" href="./styles.css" />
    <script defer src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  </head>
  <body>
    <main class="page page-post">
      <nav class="back-nav"><a href="./index.html">返回首页</a></nav>
      <article>
        <header class="post-header">
          <p id="post-date" class="meta"></p>
          <h1 id="post-title">加载中...</h1>
          <p id="post-summary" class="lead lead-small"></p>
        </header>
        <div id="post-content" class="markdown-body"></div>
      </article>
    </main>
    <script>
      async function main() {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug');

        if (!slug) {
          throw new Error('缺少 slug 参数');
        }

        const postsResponse = await fetch('./posts.json');
        const posts = await postsResponse.json();
        const post = posts.find((item) => item.slug === slug);

        if (!post) {
          throw new Error('文章不存在');
        }

        document.title = post.title + ' | MyBlog';
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-date').textContent = post.date || '未设置日期';
        document.getElementById('post-summary').textContent = post.summary || '';

        const markdownResponse = await fetch('./posts/' + encodeURIComponent(slug) + '.md');
        const markdown = await markdownResponse.text();
        document.getElementById('post-content').innerHTML = marked.parse(markdown);
      }

      main().catch((error) => {
        document.getElementById('post-title').textContent = '加载失败';
        document.getElementById('post-content').innerHTML = '<p>' + error.message + '</p>';
      });
    </script>
  </body>
</html>`
}

function buildStyles() {
  return `:root {
  color-scheme: light;
  --bg: #f6f3ec;
  --panel: #fffdf8;
  --line: #d9d1c2;
  --text: #22201b;
  --muted: #6b655a;
  --accent: #9b6b2f;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: radial-gradient(circle at top, #fff8ea 0%, var(--bg) 52%);
  color: var(--text);
  font-family: Georgia, "Noto Serif SC", serif;
}

a {
  color: inherit;
}

.page {
  width: min(880px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 40px 0 72px;
}

.hero,
.card,
.post-header,
.markdown-body,
.back-nav {
  background: rgba(255, 253, 248, 0.88);
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 12px 30px rgba(74, 53, 22, 0.08);
}

.hero,
.post-header,
.markdown-body {
  padding: 28px;
}

.hero h1,
.post-header h1 {
  margin: 8px 0 12px;
  font-size: clamp(2rem, 6vw, 3.5rem);
  line-height: 1.08;
}

.eyebrow,
.meta,
.count {
  color: var(--muted);
  font-size: 0.95rem;
}

.lead {
  margin: 0;
  color: var(--muted);
  font-size: 1.05rem;
  line-height: 1.8;
}

.lead-small {
  margin-top: 8px;
}

.section-head {
  margin: 24px 0 16px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.post-list {
  display: grid;
  gap: 16px;
}

.card {
  padding: 20px 22px;
}

.card h3 {
  margin: 6px 0 10px;
  font-size: 1.3rem;
}

.card a {
  text-decoration: none;
  border-bottom: 1px solid transparent;
}

.card a:hover {
  color: var(--accent);
  border-color: currentColor;
}

.card p,
.empty,
.markdown-body {
  color: var(--muted);
  line-height: 1.85;
}

.empty,
.back-nav {
  margin-top: 16px;
  padding: 18px 20px;
}

.back-nav {
  margin-bottom: 18px;
}

.back-nav a {
  text-decoration: none;
}

.back-nav a:hover {
  color: var(--accent);
}

.page-post {
  width: min(920px, calc(100vw - 32px));
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  color: var(--text);
  line-height: 1.3;
}

.markdown-body pre,
.markdown-body code {
  font-family: "Cascadia Code", Consolas, monospace;
}

.markdown-body pre {
  overflow-x: auto;
  padding: 14px;
  background: #f3eee2;
  border-radius: 12px;
}

.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 14px;
}

@media (max-width: 640px) {
  .hero,
  .post-header,
  .markdown-body,
  .card,
  .back-nav {
    padding: 18px;
    border-radius: 16px;
  }

  .page {
    padding-top: 20px;
  }
}`
}

function buildSite() {
  const posts = collectPosts()

  rmSync(outDir, { recursive: true, force: true })
  ensureDir(outDir)
  ensureDir(join(outDir, 'posts'))

  for (const post of posts) {
    writeFileSync(join(outDir, 'posts', `${post.slug}.md`), `${post.content}\n`, 'utf8')
  }

  if (existsSync(assetsDir)) {
    cpSync(assetsDir, join(outDir, 'assets'), { recursive: true })
  }

  writeFileSync(
    join(outDir, 'posts.json'),
    `${JSON.stringify(
      posts.map(({ slug, title, date, summary }) => ({ slug, title, date, summary })),
      null,
      2
    )}\n`,
    'utf8'
  )
  writeFileSync(join(outDir, 'index.html'), buildIndexHtml(), 'utf8')
  writeFileSync(join(outDir, 'post.html'), buildPostHtml(), 'utf8')
  writeFileSync(join(outDir, 'styles.css'), buildStyles(), 'utf8')
  writeFileSync(join(outDir, '404.html'), buildIndexHtml(), 'utf8')
}

buildSite()
console.log(`[pages] Built site to ${outDir}`)
