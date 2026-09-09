/**
 * ============================================================
 *  云梦的数理小屋 —— 全站唯一配置源
 *  改这里就能改全站，不需要动任何代码文件。
 * ============================================================
 */
module.exports = {
  /* ---------- 1. 站点基本信息 ---------- */
  site: {
    title: '云梦的数理小屋',
    subtitle: '数学与物理的读书笔记',
    description: '一个记录微积分、线性代数、经典力学与量子力学的个人博客，包含推导、公式与可运行代码。',
    author: '云梦',
    // 站点最终访问的网址（结尾不要带斜杠）
    url: 'https://ClouderDream.github.io/math-hut',
    // 部署子路径。项目站点填 '/math-hut/'；
    // 若仓库名改成 ClouderDream.github.io（用户主页站），这里改成 '/'
    base: '/math-hut/',
    lang: 'zh-CN',
    copyright: '© 2026 云梦',
    // 每页显示多少篇文章（改这个数字即可调整分页；想看分页效果可改成 2）
    postsPerPage: 4,
  },

  /* ---------- 2. 导航菜单 ---------- */
  nav: [
    { text: '首页', link: '/' },
    { text: '归档', link: '/archive/' },
    { text: '标签', link: '/tags/' },
    { text: '关于', link: '/about/' },
    { text: '搜索', link: '/search/' },
  ],

  /* ---------- 3. 社交链接（联系我）---------- */
  social: [
    { name: 'GitHub', icon: 'github', link: 'https://github.com/ClouderDream', text: 'github.com/ClouderDream' },
    { name: '邮箱', icon: 'mail', link: 'mailto:your-email@example.com', text: 'your-email@example.com' },
  ],

  /* ---------- 4. 阅读时长计算 ---------- */
  readingTime: {
    // 中文阅读速度：字/分钟
    wordsPerMinute: 350,
    // 一个英文单词折算成多少个中文字
    enWordWeight: 1.5,
    // 一行代码折算成多少个中文字
    codeLineWeight: 12,
  },

  /* ---------- 5. 全站搜索 ---------- */
  search: {
    // 每篇文章正文最多取多少字进索引（控制索引体积）
    maxBodyChars: 1200,
    // 搜索结果最多返回多少条
    maxResults: 20,
  },

  /* ---------- 6. 后台管理 ---------- */
  admin: {
    enabled: true,
    // 访问路径：站点地址 + /admin/
    path: '/admin/',
    // GitHub 仓库信息（后台通过 GitHub API 读写文章）
    owner: 'ClouderDream',
    repo: 'math-hut',
    branch: 'main',
    // 注意：博客在 v1.1/ 子目录，后台读写必须带前缀
    postsDir: 'v1.1/content/posts',
    pagesDir: 'v1.1/content/pages',
    imagesDir: 'v1.1/content/images',
    siteConfigPath: 'v1.1/content/site.json',
    // 管理口令的 SHA-256 哈希 + 盐。
    // 生成方法：在项目目录运行  npm run hash-password 你的口令
    // 然后把下面两行替换成命令输出的结果。
    // ⚠️ 这只是"防误点"的门槛，不是安全措施；真正的安全边界是 GitHub Token。
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
    // 常用宏：在公式里可以直接用 \R \C \d 等简写
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
