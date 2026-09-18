/**
 * ============================================================
 *  云梦的数理小屋 —— 全站唯一配置源
 *  改这里就能改全站，不需要动任何代码文件。
 * ============================================================
 */
module.exports = {
  /* ---------- 1. 站点基本信息 ---------- */
  site: {
    title: '云梦数理小屋',
    subtitle: '数理 · 直觉 · 证明',
    description: '一个记录微积分、线性代数、经典力学与量子力学的个人博客，包含推导、公式与可运行代码。',
    author: '云梦',
    // GitHub Pages 的站点源（不要包含下面的 base，也不要以 / 结尾）。
    // 项目页最终地址由 url + base 组成，例如 https://ClouderDream.github.io + /math-hut/。
    url: 'https://ClouderDream.github.io',
    // 部署子路径。项目站点填 '/math-hut/'；
    // 若仓库名改成 ClouderDream.github.io（用户主页站），这里改成 '/'
    base: '/math-hut/',
    lang: 'zh-CN',
    copyright: '© 2026 云梦',
    // 每页显示多少篇文章
    postsPerPage: 5,
  },

  /* ---------- 2. 导航菜单（content/site.json 会覆盖这里） ---------- */
  nav: [
    { text: '首页', link: '/' },
    { text: '归档', link: '/archive/' },
    { text: '标签', link: '/tags/' },
    { text: '关于', link: '/about/' },
    { text: '搜索', link: '/search/' },
  ],

  /* ---------- 3. 社交链接（content/site.json 会覆盖这里） ---------- */
  social: [
    { name: 'GitHub', icon: 'github', link: 'https://github.com/ClouderDream', text: 'github.com/ClouderDream' },
    { name: '邮箱', icon: 'mail', link: 'mailto:your-email@example.com', text: 'your-email@example.com' },
  ],

  /* ---------- 4. 阅读时长计算 ---------- */
  readingTime: {
    wordsPerMinute: 350,
    enWordWeight: 1.5,
    codeLineWeight: 12,
  },

  /* ---------- 5. 全站搜索 ---------- */
  search: {
    maxBodyChars: 1200,
    maxResults: 20,
  },

  /* ---------- 6. 后台管理 ---------- */
  admin: {
    enabled: true,
    path: '/admin/',
    owner: 'ClouderDream',
    repo: 'math-hut',
    branch: 'main',
    postsDir: 'v1.4/content/posts',
    pagesDir: 'v1.4/content/pages',
    imagesDir: 'v1.4/content/images',
    siteConfigPath: 'v1.4/content/site.json',
    // 管理口令的 SHA-256 哈希 + 盐。
    // 生成方法：在项目目录运行 npm run hash-password 你的口令，再替换下面两行。
    // 这只是“防误点”的门槛；真正的权限边界是 GitHub Token。
    passHash: 'df47b8b4abd97a1dcc76397bf1259af0ae6ba9a3934bbfd8d4294a8369f9303b',
    passSalt: 'change-me',
  },

  /* ---------- 7. RSS / sitemap ---------- */
  feed: {
    enableRSS: true,
    enableSitemap: true,
  },

  /* ---------- 8. KaTeX 数学公式 ---------- */
  math: {
    macros: {
      '\\R': '\\mathbb{R}',
      '\\C': '\\mathbb{C}',
      '\\N': '\\mathbb{N}',
      '\\Z': '\\mathbb{Z}',
      '\\d': '\\mathrm{d}',
      '\\dd': '\\frac{\\mathrm{d}}{\\mathrm{d}#1}',
      '\\pd': '\\frac{\\partial}{\\partial #1}',
      '\\bra': '\\langle #1 |',
      '\\ket': '| #1 \\rangle',
      '\\braket': '\\langle #1 \\rangle',
    },
  },
};
