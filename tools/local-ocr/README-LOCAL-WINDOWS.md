# Windows 本地 OCR 快速开始

## 推荐目录

建议把仓库放在不含中文和空格的目录，例如：

```text
D:\codex_work\math-hut
```

## 第一次安装

已有仓库：

```powershell
cd D:\codex_work\math-hut\tools\local-ocr
.\install.ps1
```

还没有仓库，可以在任意位置运行本仓库中的 `bootstrap.ps1`：

```powershell
.\bootstrap.ps1 -TargetDir "D:\codex_work\math-hut"
```

或者双击：

```text
install.cmd
```

## 每次使用

双击：

```text
start.cmd
```

它会：

1. 检查本地 OCR 环境；
2. 如果仓库无未提交改动，则尝试从 GitHub `main` 拉取最新代码；
3. 检查 8765 端口是否已有服务；
4. 启动 `127.0.0.1:8765`；
5. 打开网站后台。

## 出现问题

双击：

```text
doctor.cmd
```

诊断项包括 Git、Python 虚拟环境、FastAPI、OpenCV、Pillow、PaddleOCR、PaddlePaddle、`server.py` 语法以及本地服务健康状态。

## 更新

```powershell
.\update.ps1
```

需要同步 Python 依赖时：

```powershell
.\update.ps1 -Dependencies
```

## 安全边界

- 服务默认只监听 `127.0.0.1:8765`；
- 不应改为 `0.0.0.0`，除非明确理解局域网暴露风险；
- OCR 图片/PDF 默认只在本机处理；
- GitHub 只托管代码、配置、文章和最终选择上传的图片，不托管 PaddleOCR 模型缓存；
- `.venv/`、模型、日志、本地配置均由 `.gitignore` 排除。
