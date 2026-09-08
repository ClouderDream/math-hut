# 云梦的数理小屋 · 项目根

数学与物理主题的静态博客（部署于 GitHub Pages：`https://clouderdream.github.io/math-hut/`）。

## 目录约定

| 目录 | 用途 |
|------|------|
| `v1.1/` | 当前**活跃版本**（博客本体）。 |
| `v1.0/` | 上一个稳定版本，保留不删除。 |
| `v1.x/tmp/` | 对应版本的中间产物（草稿、截图、临时导出等），不进最终交付。 |
| `tools/` | 长期复用、跨版本共享的工具/脚本。 |
| `.github/` | CI 工作流（必在仓库根，GitHub Actions 只认根目录）。 |
| `.agent` | 项目约定与关键文件索引，供 AI/Agent 快速接手。 |

## 版本内结构（以 v1.1 为例）

```
v1.0/
  src/            生成器源码（Node + EJS）
  content/        文章 Markdown 源
  docs/           设计/技术文档
  scripts/        辅助脚本（new-post、hash-password…）
  dist/           构建产物（git 忽略）
  node_modules/   依赖（git 忽略）
  .github/        ← 注意：实际 CI 在仓库根 .github/，这里只是源码镜像
  package.json    构建脚本
  site.config.js  站点配置
  GITHUB操作手册.md 部署/维护手册
  tmp/            中间产物
```

## 构建与部署

```bash
cd v1.1
npm ci
npm run build      # 产物在 v1.1/dist
```

推送 `main` 后由根目录 `.github/workflows/deploy.yml` 自动构建并部署（工作目录 `v1.1`）。

## 其他

- 文件按类型归类：文章进 `content/`，源码进 `src/`，文档进 `docs/`，中间产物进对应版本 `tmp/`。
- 个人凭据（PAT）绝不写入任何文件/日志/记忆，仅临时内嵌用于 push 命令。
