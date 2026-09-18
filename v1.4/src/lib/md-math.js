/**
 * KaTeX × markdown-it 插件（Node 与浏览器共用同一份，保证"后台预览 = 线上效果"）
 *
 * 核心难点：$a_1$ 里的下划线会被 markdown-it 当成斜体标记吞掉。
 * 解决办法：把行内数学规则注册在 escape / emphasis **之前**，
 *          让 $...$ 在斜体解析前就被整体吃掉并输出成 HTML，内部下划线永不参与 Markdown 解析。
 */
(function () {
  var katex;
  var hasRequire = typeof require !== 'undefined';
  if (hasRequire) {
    try { katex = require('katex'); } catch (e) { katex = null; }
  }
  if (!katex && typeof window !== 'undefined') katex = window.katex;

  var OPTIONS = { throwOnError: false, errorColor: '#cc0000', strict: 'ignore', trust: false, output: 'htmlAndMathml' };

  function setOptions(o) { Object.assign(OPTIONS, o || {}); }

  function escHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /** 记录渲染失败的公式，构建结束时统一打印 */
  var errors = [];
  function getErrors() { return errors.slice(); }
  function resetErrors() { errors = []; }

  function render(src, display, where) {
    if (!katex) return '<code>' + escHtml(src) + '</code>';
    try {
      return katex.renderToString(src, Object.assign({ displayMode: !!display }, OPTIONS));
    } catch (e) {
      errors.push({ src: src, message: e && e.message ? e.message : String(e), where: where || '' });
      return '<code class="katex-error" title="' + escHtml(e.message) + '">' + escHtml(src) + '</code>';
    }
  }

  /* ---------------- 行内公式 $...$ ---------------- */
  function mathInline(state, silent) {
    var s = state.src, start = state.pos;
    if (s.charCodeAt(start) !== 0x24 /* $ */) return false;
    if (s.charCodeAt(start + 1) === 0x24) return false;      // $$ 交给块级规则
    var next = s.charAt(start + 1);
    if (!next || /\s/.test(next)) return false;              // "$ x $" 不算公式

    var pos = start + 1, end = -1;
    while (pos < state.posMax) {
      var ch = s.charAt(pos);
      if (ch === '\\') { pos += 2; continue; }               // 跳过转义
      if (ch === '\n') return false;                         // 行内公式不跨行
      if (ch === '$') { end = pos; break; }
      pos++;
    }
    if (end < 0) return false;
    if (/\s/.test(s.charAt(end - 1))) return false;          // 结尾 $ 前不能是空格
    if (/[0-9]/.test(s.charAt(end + 1))) return false;       // 规避 "$5 和 $100" 这类价格写法

    var body = s.slice(start + 1, end);
    if (!body.trim()) return false;

    if (!silent) {
      var token = state.push('html_inline', '', 0);
      token.content = render(body, false, 'inline');
    }
    state.pos = end + 1;
    return true;
  }

  /* ---------------- 行间公式 $$...$$ ---------------- */
  function mathBlock(state, startLine, endLine, silent) {
    var pos = state.bMarks[startLine] + state.tShift[startLine];
    var max = state.eMarks[startLine];
    if (pos + 2 > max) return false;
    if (state.src.slice(pos, pos + 2) !== '$$') return false;

    pos += 2;
    var firstLine = state.src.slice(pos, max);
    var nextLine = startLine;
    var found = false;
    var buf = [];

    if (firstLine.trim().endsWith('$$')) {
      buf.push(firstLine.trim().slice(0, -2));
      found = true;
    }
    while (!found) {
      nextLine++;
      if (nextLine >= endLine) break;
      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];
      var line = state.src.slice(pos, max);
      if (line.trim().endsWith('$$')) { buf.push(line.trim().slice(0, -2)); found = true; }
      else buf.push(line);
    }
    if (!found) return false;
    if (silent) return true;

    state.line = nextLine + 1;
    var token = state.push('math_block', '', 0);
    token.block = true;
    token.markup = '$$';
    token.map = [startLine, state.line];
    token.content = buf.join('\n').trim();
    return true;
  }

  function mathPlugin(md) {
    md.inline.ruler.before('escape', 'math_inline', mathInline);
    md.block.ruler.before('paragraph', 'math_block', mathBlock, {
      alt: ['paragraph', 'reference', 'blockquote', 'list'],
    });
    md.renderer.rules.math_block = function (tokens, idx) {
      return '<div class="math-block">' + render(tokens[idx].content, true, 'block') + '</div>\n';
    };
    // 让代码块里的内容彻底不被当作公式
    md.renderer.rules.fence = md.renderer.rules.fence; // 保持原样
  }

  mathPlugin.setOptions = setOptions;
  mathPlugin.getErrors = getErrors;
  mathPlugin.resetErrors = resetErrors;
  mathPlugin.render = render;

  if (typeof module !== 'undefined' && module.exports) module.exports = mathPlugin;
  if (typeof window !== 'undefined') window.mathPlugin = mathPlugin;
})();
