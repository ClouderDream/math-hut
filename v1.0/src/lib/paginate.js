/**
 * 分页工具
 */
function paginate(items, perPage) {
  const size = Number(perPage) > 0 ? Number(perPage) : 5;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push({
      number: i,
      items: items.slice((i - 1) * size, i * size),
      isFirst: i === 1,
      isLast: i === totalPages,
    });
  }
  return { pages, total, totalPages, perPage: size };
}

/** 第 n 页的 URL：第 1 页是 '/'，其余是 '/page/n/' */
function pageUrl(base, n) {
  const b = base === '/' ? '/' : base;
  if (n <= 1) return b;
  return b + 'page/' + n + '/';
}

/** 生成给模板用的分页器对象（含省略号） */
function buildPager(current, totalPages, base) {
  const urlOf = (n) => pageUrl(base, n);
  let links;
  if (totalPages <= 7) {
    links = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    links = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);
    if (start > 2) links.push('…');
    for (let i = start; i <= end; i++) links.push(i);
    if (end < totalPages - 1) links.push('…');
    links.push(totalPages);
  }
  return {
    current,
    totalPages,
    links,
    urlOf,
    prevUrl: urlOf(current - 1),
    nextUrl: urlOf(current + 1),
  };
}

module.exports = { paginate, pageUrl, buildPager };
