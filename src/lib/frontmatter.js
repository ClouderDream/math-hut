/**
 * front-matter 解析 + 字段兜底
 * 必填：title、date、tags、summary（缺失会自动补，不会让构建失败）
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { slugFromFilename } = require('./slug');

/** 把各种写法统一成 YYYY-MM-DD */
function normalizeDate(v) {
  if (!v) return '';
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

/** 用于排序与 sitemap 的时间戳 */
function toISODate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T00:00:00+08:00` : new Date().toISOString();
}

function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v).split(/[,，]/).map((x) => x.trim()).filter(Boolean);
}

/** 自动摘要：取正文前 N 字（去掉标题与公式与代码） */
function autoSummary(body, len = 110) {
  let text = String(body)
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$[^$\n]*\$/g, '')
    .replace(/^\s{0,3}#{1,6}\s+.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > len ? text.slice(0, len) + '…' : text;
}

function parseFile(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const parsed = matter(raw);
  const data = parsed.data || {};
  const filename = path.basename(file);
  const stat = fs.statSync(file);

  const date = normalizeDate(data.date) || normalizeDate(stat.birthtime) || normalizeDate(stat.mtime) || '';
  const body = parsed.content || '';

  return {
    slug: data.slug ? String(data.slug) : slugFromFilename(filename),
    title: data.title ? String(data.title) : filename.replace(/\.md$/i, ''),
    date,
    dateISO: toISODate(date),
    tags: toArray(data.tags),
    summary: data.summary ? String(data.summary) : autoSummary(body),
    draft: data.draft === true || /^_draft-/.test(filename),
    search: data.search !== false,
    body,
    filePath: file,
    fileName: filename,
    updated: normalizeDate(data.updated) || date,
  };
}

module.exports = { parseFile, normalizeDate, toISODate, toArray, autoSummary };
