# v1.3 总览：云梦数理小屋（极简编辑风）

## 这一版是什么

以 `v1.3/ui_new/main/v1-main-editorial.html` 与 `v1.3/ui_new/admin/v1-admin-editorial.html`
为基准，把 v1.2 迭代成 **v1.3「极简编辑风」**：暖纸底 + 墨蓝点缀 + 衬线标题。
v1.3 已经是 **GitHub Pages 的部署版本**（`.github/workflows/deploy.yml` 指向 v1.3）。

- 项目目录：`G:\buddywork\9.7云梦数理小屋\v1.3\`
- 线上地址：https://ClouderDream.github.io/math-hut/
- 后台入口：https://ClouderDream.github.io/math-hut/admin/
- 本地预览：`cd v1.3 && node scripts/dev.js --no-watch --port 4173` → http://localhost:4173/math-hut/

## 视觉与结构改动

| 区域 | v1.2 | v1.3（编辑风） |
|---|---|---|
| 顶部 | 蓝底 banner + 深蓝水平导航 | 吸顶细线导航：圆形「云」品牌标 + 导航 + 搜索胶囊 |
| 首页头图 | 无 | Hero：kicker「数理 · 直觉 · 证明」+ 衬线大标题 + lede + 双 CTA |
| 首页列表 | 平铺卡片 | 「本期精选」单独放大 + 编号列表（01…） |
| 侧栏 | widget 列表 | 卡片式挂件（关于小屋 / 标签云 / 近期更新 / 订阅） |
| 配色 | 白底 + 蓝条 #2563eb | 暖纸 `#FBF9F4` + 墨蓝 `#34406B` |
| 字体 | Noto Sans/Serif SC | 标题 Fraunces + Noto Serif SC，正文 Noto Sans SC |
| 主题 | 明暗双主题 | **仅浅色**（纸感设计，移除暗色与切换按钮） |
| 后台 | 蓝白学术风 | 同色板编辑风，登录卡换圆形「云」标 |

### 首页「精选 + 列表」怎么算的

`src/generators/index.js` 负责：

- 第 1 页：首篇升为 `featured`，列表显示其余 `p.items.slice(1)`
- 第 2 页起：无 featured，列表显示整页 5 篇

这样既复刻了设计稿「1 精选 + 4 编号」，又保持 `postsPerPage = 5` 的分页不变。

## 构建与部署结果

```
[build] 云梦数理小屋  →  dist/   (base = /math-hut/)
  · 文章 10 篇
  · 分页 2 页 · 标签 20 个 · 搜索索引 10.1 KB
[done] 用时 1.48s
```

- 本地路由冒烟：首页 / 文章页 / 管理页 / main.css 均 200
- 线上校验：commit `3e36113`，Actions run `34460594622` **success**
- curl 线上已确认：标题「云梦数理小屋 · 数理 · 直觉 · 证明」、Hero 标题、
  精选文章、编号列表 4 条、v1.3 页脚均已生效

## 后续改动务必注意的约束

1. **`content/site.json` 会覆盖 `site.config.js`** 的 `site` / `nav` / `social`
   （见 `src/lib/config.js`）。改站点标题、副标题、导航必须**两处同步**。
2. **`code.css` 依赖 main.css 提供的变量**：
   `--accent`、`--bg`、`--fg-muted`、`--font-mono`、`--radius-sm`。
   重写 main.css 时若删掉这些变量，代码块描边与圆角会失效。
3. **admin.ejs 同时加载 main.css 和 admin.css**，admin.css 必须**最后加载**，
   否则主站的 `.btn` 等基础样式会覆盖后台样式。
4. **后台是 GitHub API 驱动的 SPA**（`admin.js` + `github.js` 靠 id 取元素）。
   改后台请「只换 CSS 视觉」，不要重构 `admin.ejs` 的结构或 id，否则功能会断。
5. 后台读写路径集中在 `site.config.js` 的 `admin.postsDir / pagesDir / imagesDir / siteConfigPath`，
   当前均为 `v1.3/content/...`。

## 还没做的事

- **后台口令仍是默认占位值**：建议跑 `npm run hash-password 你的口令`，
  把输出填进 `site.config.js` 的 `passHash` / `passSalt`。
- **联系方式是占位值**：`content/site.json` 的邮箱仍是 `your-email@example.com`。
- Hero 首屏文案目前写死在 `src/templates/index.ejs`（kicker / 大标题 / lede 后半句），
  若要完全交给后台配置，需要再往 `site.json` 里加字段。
