# Math Hut Local OCR

完全免费、开源、在本机执行的 OCR / 数学公式 / 草图辅助服务，为 `math-hut` 的 GitHub Pages 后台 `/admin/` 提供识别能力。

**GitHub 负责托管代码与版本；OCR 推理在你的电脑上执行。** 不需要 Mathpix、OCR API Key、云服务器或按次付费服务。

## 当前能力

- 图片 / 扫描 PDF → PP-StructureV3 → Markdown；
- 中文、英文、版面与数学公式识别；
- 草图手动裁切；
- 简单线段/圆等几何元素 → SVG + TikZ；
- 复杂草图可靠性不足时回退到裁切 PNG / SVG；
- FastAPI loopback 服务：`http://127.0.0.1:8765`。

## 目录中的一键脚本

| 文件 | 用途 |
|---|---|
| `bootstrap.ps1` | 将仓库拉取到指定目录并初始化 OCR 环境 |
| `install.ps1` / `install.cmd` | 创建 `.venv`、安装依赖、校验环境 |
| `start.ps1` / `start.cmd` | 可选更新 GitHub 后启动 OCR 服务 |
| `stop.ps1` / `stop.cmd` | 停止 8765 上的本项目 Python 服务 |
| `update.ps1` | fast-forward 更新仓库，可选同步依赖 |
| `doctor.ps1` / `doctor.cmd` | 环境诊断 |
| `LOCAL_SETUP_CHECKLIST.md` | 本机安装验收清单 |
| `CODEX_LOCAL_SETUP_PROMPT.md` | Codex 本机配置提示词模板 |

## Windows 首次安装

推荐 Python **3.11 x64**，Python 3.10 也可。

已有仓库时：

```powershell
cd <你的仓库目录>\tools\local-ocr
.\install.ps1
```

也可以直接双击：

```text
install.cmd
```

安装脚本会：

1. 自动寻找 Python 3.11 / 3.10；
2. 创建 `tools/local-ocr/.venv`；
3. 安装 `requirements.txt`；
4. 检查 `server.py` 语法；
5. 检查 FastAPI、OpenCV、Pillow、PaddleOCR、PaddlePaddle 是否可导入。

如果 PaddlePaddle 因具体 CPU/GPU 环境安装失败，应按 PaddlePaddle 官方安装说明选择对应 wheel，再继续安装，不要改成付费 OCR API。

## 从指定目录一键初始化

```powershell
.\bootstrap.ps1 -TargetDir "D:\codex_work\math-hut"
```

它会在目标目录不存在时 clone：

```text
https://github.com/ClouderDream/math-hut.git
```

目标目录已经是本仓库时，会在工作区干净的情况下 fast-forward 更新 `main`，随后执行安装。

## 日常启动

最简单：双击

```text
start.cmd
```

或：

```powershell
.\start.ps1
```

默认流程：

```text
检查本地环境
→ 工作区干净时检查 origin/main 更新
→ 检查 8765 是否已有服务
→ 启动 127.0.0.1:8765
→ 打开 GitHub Pages 后台
```

不自动拉取代码：

```powershell
.\start.ps1 -NoUpdate
```

不打开浏览器：

```powershell
.\start.ps1 -NoBrowser
```

## 健康检查

```text
GET http://127.0.0.1:8765/health
```

预期：

```json
{
  "ok": true,
  "engine": "PaddleOCR PP-StructureV3",
  "paid_api": false,
  "sketch": true
}
```

后台 OCR 页也会自动检查此地址。

## OCR API

### `POST /ocr`

`multipart/form-data`：

- `file`: JPG / PNG / WebP / TIFF / PDF

返回 Markdown：

```json
{
  "ok": true,
  "markdown": "...",
  "engine": "PP-StructureV3"
}
```

PP-StructureV3 需要 PaddleOCR 的 `doc-parser` 能力，因此 requirements 使用 `paddleocr[doc-parser]`。

## 草图 API

### `POST /sketch`

字段：

- `file`: 图片；
- `x`, `y`: 裁切左上角百分比；
- `w`, `h`: 裁切宽高百分比。

返回：

- `svg`：基础几何矢量结果；
- `tikz`：基础 TikZ `\draw` 代码；
- `crop_png_data_url`：保真裁切图；
- `detected.lines/circles`：线段和圆数量。

### 草图策略

TikZ 不是所有手绘图的默认输出。当前稳定策略是：

```text
简单几何 → TikZ + SVG
中等复杂 → SVG / 裁切图 + 人工整理
复杂自由手绘 → 保留裁切 PNG
```

适合 TikZ 的内容：坐标轴、线段、三角形、矩形、圆、简单几何示意。

不应强行自动 TikZ：复杂函数曲线、大量箭头、手写标签、重叠严重的笔迹。

网站正文优先显示 SVG / 图片；TikZ 作为论文/LaTeX 排版时的可编辑源代码。

## 模型与 GitHub

模型权重**不进入 GitHub**。

GitHub 保存：

- 服务源码；
- 安装/启动/更新脚本；
- requirements 与配置模板；
- 网站源码、文章和版本历史。

本机保存：

- `.venv`；
- PaddleOCR 模型缓存；
- 临时文件；
- 日志；
- 本地配置覆盖。

这些内容已由 `.gitignore` 排除。

## 安全与隐私

- 默认只监听 `127.0.0.1`，不要为了排错改成 `0.0.0.0`；
- 图片/PDF 默认在本机处理；
- 后台通过 localhost 调用；
- 不需要任何 OCR API Key；
- 数学 OCR 结果只作为初稿，必须人工核对后再发布。

## 更新与诊断

更新代码：

```powershell
.\update.ps1
```

同时同步依赖：

```powershell
.\update.ps1 -Dependencies
```

诊断：

```powershell
.\doctor.ps1
```

停止：

```powershell
.\stop.ps1
```

更多说明见本目录中的 `README-LOCAL-WINDOWS.md`、`README-TROUBLESHOOTING.md` 和 `LOCAL_SETUP_CHECKLIST.md`。
