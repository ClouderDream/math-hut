# 云梦的数理小屋 · 项目根

数学与物理主题的静态博客（部署于 GitHub Pages：`https://clouderdream.github.io/math-hut/`）。

## 当前版本

- `v1.4/`：当前**活跃版本**，GitHub Pages 构建与后台管理均以此目录为准。
- `v1.3/`、`v1.2/`、`v1.1/`、`v1.0/`：历史稳定版本，保留用于追溯与回滚。
- [`VERSION_HISTORY.md`](VERSION_HISTORY.md)：项目长期版本日志，记录每轮重要改动、Bug、修复、架构、希望长期保留的设计原则，以及 V2.x / V3.x 演进条件。

## 目录约定

| 目录 | 用途 |
|------|------|
| `v1.4/` | 当前活跃博客源码、内容、后台与构建系统。 |
| `v1.0/` ~ `v1.3/` | 历史稳定版本，保留不删除。 |
| `tools/` | 跨版本长期复用的工具，例如 `tools/local-ocr/` 免费本地 OCR 服务。 |
| `.github/` | CI / GitHub Pages 工作流。 |
| `.agent` | 项目约定与关键文件索引，供 AI/Agent 快速接手。 |

## 当前核心架构

```text
Markdown / 图片内容
        ↓
Node.js + EJS 静态生成器
        ↓
v1.4/dist
        ↓
GitHub Actions smoke test
        ↓
GitHub Pages
```

后台仍是纯静态页面，通过 GitHub API 直接管理仓库内容：

```text
/admin/
  ↓
GitHub PAT
  ↓
GitHub Contents API
  ↓
main
  ↓
Actions 自动构建部署
```

OCR 不再要求付费 Mathpix。免费本地方案位于：

```text
tools/local-ocr/
```

浏览器后台通过 `http://127.0.0.1:8765` 调用本机 PaddleOCR 服务，图片/PDF 不上传第三方 OCR 平台。V1.4 的 OCR 校对区采用 Markdown + 实时预览双栏同步滚动；草图必须先框选真实区域，复杂选区会阻止误导性的 SVG/TikZ 输出。

## 构建与部署

```bash
cd v1.4
npm ci
npm run build
npm run test:smoke
```

推送 `main` 后由根目录 `.github/workflows/deploy.yml` 自动构建并部署。

## 维护原则

- 文章进 `content/`，源码进 `src/`，版本专属文档进 `docs/`，跨版本工具进 `tools/`。
- 重大修改前保留回滚分支。
- 个人凭据（GitHub PAT 等）绝不提交到仓库。
- 数学 OCR 结果只生成初稿，必须人工校对后再发布。
- 草图 TikZ 无法可靠结构化时，优先回退为 SVG 或裁切图，不生成看似整洁但语义错误的代码。
