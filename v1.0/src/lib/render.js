/**
 * 模板渲染封装（EJS）
 */
const ejs = require('ejs');
const path = require('path');

const TPL_DIR = path.join(__dirname, '..', 'templates');

/** 模板里可能没有传的字段，给默认值，避免 EJS 报 "xxx is not defined" */
const DEFAULTS = {
  noindex: false,
  ogType: 'website',
  currentPath: '',
  pageTitle: '',
  pageDesc: '',
  canonical: '',
  lang: 'zh-CN',
  v: '1',
};

function render(tpl, data) {
  const file = path.join(TPL_DIR, tpl);
  return ejs.renderFile(file, Object.assign({}, DEFAULTS, data), {
    filename: file,
    views: [TPL_DIR],
    cache: false,
  });
}

module.exports = { render, TPL_DIR };
