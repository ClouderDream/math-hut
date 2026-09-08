/**
 * 阅读时长计算
 * 先剥掉代码块和 LaTeX 源码，再统计：
 *   有效字数 W = 中文字数 + 1.5×英文词数 + 12×代码行数
 *   分钟 = max(1, ceil(W / 350))
 */

/** 去掉围栏代码块、行内代码、LaTeX 公式、HTML 标签、Markdown 标记 */
function stripNonProse(md) {
  return String(md)
    .replace(/```[\s\S]*?```/g, (m) => '\n'.repeat(m.split('\n').length)) // 代码块 -> 保留行数
    .replace(/~~~[\s\S]*?~~~/g, (m) => '\n'.repeat(m.split('\n').length))
    .replace(/`[^`\n]*`/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]*\$/g, ' ')
    .replace(/\\\[[\s\S]*?\\\]/g, ' ')
    .replace(/\\\([\s\S]*?\\\)/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[*_~]/g, '');
}

function countWords(md, cfg) {
  const text = stripNonProse(md);
  const lines = text.split('\n');
  const codeLines = lines.filter((l) => /^\s*(import |def |for |while |if |return |#|const |let |var |function |class |> )/.test(l)).length;

  // 中日韩字符 + 中文标点
  const cjk = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\u3000-\u303f\uff00-\uffef]/g) || []).length;
  // 英文单词（连续拉丁字母/数字）
  const en = (text.replace(/[\u4e00-\u9fff\u3040-\u30ff\u3000-\u303f\uff00-\uffef]/g, ' ').match(/[A-Za-z0-9][A-Za-z0-9'’.-]*/g) || []).length;

  const W = cjk + cfg.enWordWeight * en + cfg.codeLineWeight * codeLines;
  return { cjk, en, codeLines, weight: Math.round(W) };
}

function readingTime(md, cfg = {}) {
  const opt = Object.assign({ wordsPerMinute: 350, enWordWeight: 1.5, codeLineWeight: 12 }, cfg);
  const { cjk, en, codeLines, weight } = countWords(md, opt);
  const minutes = Math.max(1, Math.ceil(weight / opt.wordsPerMinute));
  return { minutes, wordCount: cjk + en, weight, codeLines };
}

module.exports = { readingTime, stripNonProse, countWords };
