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
    <meta name="description" content="一册轻量的每日手账，记录写给自己的日记与想法。" />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="page">
      <header class="hero">
        <div class="hero-topline">
          <p class="eyebrow">MyBlog</p>
          <p class="hero-date">Daily Notes Archive</p>
        </div>
        <h1>给未来回看的手账封面</h1>
        <p class="lead">每天写一点，慢慢把日子叠成一本能翻阅的册子。这里默认只展示 <code>Posts/</code> 中已经准备公开的正式日记。</p>
      </header>

      <section class="featured-shell">
        <div class="section-head section-head-tight">
          <h2>最新日记</h2>
          <span class="count" id="featured-label">封面</span>
        </div>
        <article id="featured-card" class="featured-card">
          <div class="featured-paper">
            <p id="featured-kicker" class="featured-kicker">准备开始</p>
            <h3 id="featured-title">今天还没有公开日记</h3>
            <p id="featured-summary" class="featured-summary">等你把一篇日记放进 Posts 目录后，这里会自动变成首页主封面。</p>
            <div class="featured-meta">
              <span id="featured-date">写作模式已就绪</span>
              <a id="featured-link" class="featured-link featured-link-disabled" href="./index.html" aria-disabled="true">等待第一篇</a>
            </div>
          </div>
        </article>
      </section>

      <section class="recent-shell">
        <div class="section-head">
          <h2>最近几篇</h2>
          <span id="post-count" class="count">0 篇</span>
        </div>
        <div id="post-list" class="post-list"></div>
        <div id="empty-state" class="empty" hidden>还没有可展示的最近日记。你可以继续在本地写 Drafts，准备好后再放入 Posts。</div>
      </section>
    </main>
    <script>
      async function main() {
        const response = await fetch('./posts.json');
        const posts = await response.json();
        const featured = posts[0];
        const recentPosts = posts.slice(1, 7);
        const count = document.getElementById('post-count');
        const list = document.getElementById('post-list');
        const empty = document.getElementById('empty-state');
        const featuredLabel = document.getElementById('featured-label');

        count.textContent = posts.length + ' 篇';

        if (!featured) {
          empty.hidden = false;
          return;
        }

        featuredLabel.textContent = '最新一篇';
        document.getElementById('featured-kicker').textContent = 'Latest Entry';
        document.getElementById('featured-title').textContent = featured.title;
        document.getElementById('featured-summary').textContent = featured.summary || '这篇日记还没有填写摘要。';
        document.getElementById('featured-date').textContent = featured.date || '未设置日期';
        const featuredLink = document.getElementById('featured-link');
        featuredLink.href = './post.html?slug=' + encodeURIComponent(featured.slug);
        featuredLink.textContent = '翻开这篇日记';
        featuredLink.classList.remove('featured-link-disabled');
        featuredLink.removeAttribute('aria-disabled');

        if (!recentPosts.length) {
          empty.hidden = false;
          empty.textContent = '目前只有首页主封面这一篇。继续写下去，最近几篇列表会自动出现。';
          return;
        }

        list.innerHTML = recentPosts.map((post, index) => \`
          <article class="card">
            <div class="card-topline">
              <span class="meta">\${post.date || '未设置日期'}</span>
              <span class="card-index">0\${index + 1}</span>
            </div>
            <h3><a href="./post.html?slug=\${encodeURIComponent(post.slug)}">\${post.title}</a></h3>
            <p>\${post.summary || '这篇日记还没有填写摘要。'}</p>
            <a class="card-link" href="./post.html?slug=\${encodeURIComponent(post.slug)}">阅读全文</a>
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
          <p class="eyebrow">Daily Entry</p>
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
  --bg: #efe6d4;
  --bg-soft: #f7f1e5;
  --panel: rgba(255, 252, 245, 0.88);
  --paper: rgba(255, 250, 242, 0.96);
  --line: #d7c8b0;
  --line-strong: #beac90;
  --text: #2b2218;
  --muted: #716453;
  --accent: #a16a32;
  --accent-soft: #d5b486;
  --shadow: rgba(70, 48, 18, 0.11);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(255, 247, 228, 0.96) 0%, transparent 36%),
    linear-gradient(180deg, #f8f0e2 0%, var(--bg) 48%, #e6dac2 100%);
  color: var(--text);
  font-family: Georgia, "Noto Serif SC", serif;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(126, 95, 54, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(126, 95, 54, 0.03) 1px, transparent 1px);
  background-size: 100% 28px, 28px 100%;
  opacity: 0.45;
}

a {
  color: inherit;
}

.page {
  position: relative;
  width: min(980px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 42px 0 80px;
}

.hero,
.featured-card,
.card,
.post-header,
.markdown-body,
.back-nav,
.empty {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 24px;
  box-shadow: 0 18px 40px var(--shadow);
}

.hero,
.featured-card,
.post-header,
.markdown-body,
.back-nav,
.empty,
.card {
  position: relative;
  overflow: hidden;
}

.hero {
  padding: 30px 30px 26px;
}

.featured-card,
.post-header,
.markdown-body {
  padding: 30px;
}

.hero::after,
.featured-card::after,
.post-header::after,
.markdown-body::after {
  content: "";
  position: absolute;
  inset: 12px;
  border: 1px solid rgba(190, 172, 144, 0.45);
  border-radius: 18px;
  pointer-events: none;
}

.hero-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hero-date {
  margin: 0;
  color: var(--muted);
  font-size: 0.92rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero h1,
.post-header h1 {
  margin: 10px 0 12px;
  font-size: clamp(2rem, 6vw, 3.5rem);
  line-height: 1.04;
  letter-spacing: -0.03em;
}

.eyebrow,
.meta,
.count,
.featured-kicker,
.card-index {
  color: var(--muted);
  font-size: 0.95rem;
}

.eyebrow,
.featured-kicker {
  margin: 0;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.lead {
  margin: 0;
  color: var(--muted);
  font-size: 1.06rem;
  line-height: 1.9;
  max-width: 58ch;
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

.section-head h2 {
  margin: 0;
  font-size: 1.55rem;
}

.section-head-tight {
  margin-top: 28px;
}

.featured-shell,
.recent-shell {
  margin-top: 18px;
}

.featured-paper {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 14px;
  padding: 28px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.75) 0%, rgba(246, 234, 212, 0.86) 100%),
    linear-gradient(90deg, transparent 0, transparent calc(100% - 62px), rgba(173, 128, 77, 0.06) calc(100% - 62px), rgba(173, 128, 77, 0.06) 100%);
}

.featured-title,
.featured-paper h3 {
  margin: 0;
}

.featured-paper h3 {
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1.06;
}

.featured-summary {
  margin: 0;
  max-width: 52ch;
  color: var(--muted);
  line-height: 1.9;
  font-size: 1.03rem;
}

.featured-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 8px;
}

.featured-link,
.card-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.featured-link {
  padding: 11px 16px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: rgba(255, 250, 242, 0.92);
  box-shadow: 0 8px 20px rgba(97, 68, 33, 0.08);
}

.featured-link:hover,
.card-link:hover,
.back-nav a:hover,
.card a:hover {
  color: var(--accent);
}

.featured-link-disabled {
  opacity: 0.65;
  pointer-events: none;
}

.post-list {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.card {
  padding: 22px;
}

.card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, var(--accent-soft), var(--accent));
}

.card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card h3 {
  margin: 12px 0 10px;
  font-size: 1.3rem;
  line-height: 1.3;
}

.card a {
  text-decoration: none;
  border-bottom: 1px solid transparent;
}

.card p,
.empty,
.markdown-body {
  color: var(--muted);
  line-height: 1.85;
}

.card p {
  min-height: 5.5em;
}

.card-link {
  margin-top: 6px;
  color: var(--text);
  font-size: 0.96rem;
  font-weight: 600;
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
  font-weight: 600;
}

.page-post {
  width: min(900px, calc(100vw - 32px));
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  color: var(--text);
  line-height: 1.3;
}

.markdown-body h2 {
  margin-top: 2.2em;
  padding-bottom: 0.35em;
  border-bottom: 1px solid rgba(190, 172, 144, 0.55);
}

.markdown-body blockquote {
  margin: 1.4em 0;
  padding: 0.8em 1.1em;
  border-left: 4px solid var(--accent-soft);
  background: rgba(241, 230, 209, 0.55);
  border-radius: 0 14px 14px 0;
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
  .featured-card,
  .post-header,
  .markdown-body,
  .card,
  .back-nav {
    padding: 18px;
    border-radius: 18px;
  }

  .page {
    padding-top: 20px;
  }

  .hero-topline,
  .featured-meta,
  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .featured-paper {
    min-height: 250px;
    padding: 20px;
  }

  .card p {
    min-height: auto;
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
