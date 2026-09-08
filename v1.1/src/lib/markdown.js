/**
 * Markdown 渲染实例：Markdown + KaTeX 公式 + 代码高亮 + 标题锚点 + TOC
 */
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');
const mathPlugin = require('./md-math');
const { slugifyText, createSlugger } = require('./slug');

const LANG_LABEL = {
  python: 'Python', py: 'Python', javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript', bash: 'Shell', sh: 'Shell',
  json: 'JSON', cpp: 'C++', c: 'C', java: 'Java', matlab: 'MATLAB',
  julia: 'Julia', tex: 'LaTeX', latex: 'LaTeX', html: 'HTML', css: 'CSS',
  plaintext: '文本', text: '文本',
};

function highlight(code, lang) {
  let l = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  let html;
  try {
    html = hljs.highlight(code, { language: l, ignoreIllegals: true }).value;
  } catch (e) {
    l = 'plaintext';
    html = hljs.highlight(code, { language: 'plaintext' }).value;
  }
  const lines = html.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const body = lines.map((line) => `<span class="code-line">${line || ' '}</span>`).join('\n');
  const label = LANG_LABEL[l] || l;
  return (
    `<div class="code-block" data-lang="${l}">` +
    `<div class="code-head"><span class="code-lang">${label}</span>` +
    `<button class="code-copy" type="button" data-copy>复制</button></div>` +
    `<pre class="code-pre"><code class="hljs language-${l}">${body}</code></pre>` +
    `</div>`
  );
}

function createMarkdown(mathOptions) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    breaks: false,
    highlight,
  }).use(mathPlugin);

  if (mathOptions) mathPlugin.setOptions(mathOptions);

  // 标题加锚点 id，同时收集 TOC（h2 / h3）
  md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
    const tk = tokens[idx];
    if (tk.tag === 'h2' || tk.tag === 'h3') {
      const raw = tokens[idx + 1] ? tokens[idx + 1].content : '';
      const text = String(raw)
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')
        .replace(/\$[^$\n]*\$/g, ' ')
        .replace(/[`*_]/g, '')
        .trim();
      const id = env.slugify ? env.slugify(text) : slugifyText(text);
      tk.attrSet('id', id);
      if (!env.toc) env.toc = [];
      env.toc.push({ id, text, level: Number(tk.tag[1]) });
    }
    return self.renderToken(tokens, idx, options);
  };

  // 外链新窗口打开
  const defaultLinkOpen = md.renderer.rules.link_open ||
    function (tokens, idx, options, env, self) { return self.renderToken(tokens, idx, options); };
  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const href = tokens[idx].attrGet('href') || '';
    if (/^https?:\/\//.test(href)) {
      tokens[idx].attrSet('target', '_blank');
      tokens[idx].attrSet('rel', 'noopener noreferrer');
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  return md;
}

const md = createMarkdown();

/**
 * 渲染一篇文章正文
 * @returns { html, toc }
 */
function renderMarkdown(text, mathOptions) {
  const instance = mathOptions ? createMarkdown(mathOptions) : md;
  const env = { slugify: createSlugger(), toc: [] };
  const html = instance.render(String(text || ''), env);
  return { html, toc: buildToc(env.toc) };
}

/** 把平铺的 h2/h3 列表整理成带 children 的树 */
function buildToc(flat) {
  const tree = [];
  let current = null;
  for (const item of flat) {
    if (item.level === 2) {
      current = { ...item, children: [] };
      tree.push(current);
    } else if (item.level === 3) {
      if (current) current.children.push({ ...item });
      else tree.push({ ...item, children: [] });
    }
  }
  return tree;
}

module.exports = { createMarkdown, renderMarkdown, buildToc, md };
