# 项目总览：云梦的数理小屋

## 做了什么

一个面向数学与物理的**纯静态博客**，从零写完并构建通过。数据源是本地 Markdown，产物是可以直接托管的一堆 HTML。

- 目录：`G:\buddywork\9.7云梦数理小屋\`
- 线上目标：`https://ClouderDream.github.io/math-hut/`
- 本地预览：`http://localhost:4173/math-hut/`（已在运行）
- 后台入口：`http://localhost:4173/math-hut/admin/`

## 已实现的功能

| 功能 | 状态 | 实现要点 |
|---|---|---|
| 文章列表 + 分页 | ✅ | 每页数量在 `site.config.js` 的 `postsPerPage`，当前 4，已生成第 2 页 |
| 文章详情页 | ✅ | Markdown 渲染、代码高亮、行内/行间公式、自动目录、上下篇导航 |
| 标签分类页 | ✅ | 10 个标签，总数与单标签列表页均生成 |
| 关于页 | ✅ | `content/pages/about.md`，联系方式为占位值 |
| 归档页 | ✅ | 按年份分组 |
| 全站搜索 | ✅ | 构建期 `search-index.json`（6.7KB），前端 bigram 分词 + 字段加权打分；顶部也有搜索弹层（`/` 或 Ctrl+K 唤起） |
| 明暗主题 | ✅ | CSS 变量 + `<html data-theme>` + 内联防闪烁脚本 + localStorage |
| 响应式 | ✅ | 980px / 720px 两个断点，移动端汉堡菜单、目录折叠 |
| 在线后台 | ✅ | 纯前端 + GitHub Contents API，口令 + PAT 登录，新建/编辑/删除/实时预览 |
| RSS / sitemap / robots / 404 | ✅ | 全部生成 |
| GitHub Actions 部署 | ✅ | `.github/workflows/deploy.yml` |

## 关键技术决策

1. **零框架 Node 静态生成器**（EJS 模板），依赖仅 5 个且全部构建期使用：
   `markdown-it` / `katex` / `highlight.js` / `ejs` / `gray-matter`。读者端只有约 6KB 自写 JS。
2. **KaTeX 构建期预渲染**，读者端不加载任何 KaTeX JS，禁用 JS 也能看公式。
3. **解决 `$a_1$` 被当斜体的经典坑**：行内数学规则注册在 markdown-it `escape` 规则**之前**
   （`src/lib/md-math.js`），该文件同时兼容 Node 与浏览器，后台预览复用同一套规则。
4. **URL 全部用「目录 + index.html」**，base path 由 `site.config.js` 一处控制，
   所有链接经 `src/lib/url.js` 生成，避免 Windows 反斜杠泄漏进 URL。
5. **后台无服务端**：GitHub Pages 没有后端，只能用浏览器直调 GitHub REST API。
   管理口令哈希写在公开 JS 里，**只防误操作**；真正的安全边界是 PAT。

## 交付物清单

| 文件 | 说明 |
|---|---|
| `README.md` | 小白手册：目录结构、命令、写文章、部署、后台、常见问题 |
| `docs/技术选型-KaTeX-vs-LaTeX.md` | KaTeX / MathJax / 服务端 LaTeX 三路线九维度对比 + 限制清单 + 决策树 |
| `docs/GitHub部署与KaTeX接入指南.md` | 11 章可导出 PDF 的落地指南，每步可复制执行 |
| `site.config.js` | 全站唯一配置源 |
| `content/posts/*.md` | 5 篇示例文章（微积分 / 线性代数 / 经典力学 / 量子力学 / 电磁学） |
| `src/` | 生成器源码（lib / generators / templates / assets / admin） |
| `.github/workflows/deploy.yml` | 自动构建部署 |

## 构建与验证结果

```
[build] 云梦的数理小屋  →  dist/   (base = /math-hut/)
  · 文章 5 篇
  · 分页 2 页 · 标签 10 个 · 搜索索引 6.7 KB
[done] 用时 1.15s
```

- 公式渲染：983 处 KaTeX 输出，**0 处渲染错误**
- 路由冒烟：18 条全部 200（含中文标签页、字体 woff2、admin、rss、sitemap）
- 产物体积：3.7 MB（主要是 KaTeX 字体，前台与后台各一份）

## 还没做的事

- **GitHub 仓库尚未创建 / 未推送**：需要执行 README 第 5 节的命令，并在 Settings → Pages 把 Source 选成 GitHub Actions。
- **后台口令还是默认占位值**：需要跑 `npm run hash-password` 并把结果填进 `site.config.js`。
- **联系方式是占位值**：`site.config.js` 的 `social` 段要换成真实邮箱与 GitHub。
- **AICoding 架构专家团的 4 份架构文档**：G3《高层架构设计》因成员 Agent 工具集缺 `TaskList`/`Bash` 而崩溃过一次，已改非团队模式重试，尚未回传结果。
