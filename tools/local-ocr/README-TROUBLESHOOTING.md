# Local OCR 常见故障排查

## 后台显示“未连接”

1. 运行 `doctor.cmd`；
2. 确认 `http://127.0.0.1:8765/health` 能打开；
3. 确认没有把服务启动在其它端口；
4. 查看浏览器控制台是否有 CORS / Private Network Access / mixed-content 错误。

服务必须继续只监听 `127.0.0.1:8765`，不要为了联调改成 `0.0.0.0`。

## Paddle 安装失败

优先确认 Python 版本为 3.10/3.11 x64；再按 PaddlePaddle 官方环境要求选择 CPU/GPU 安装方式。不要把全局 Python 包和 `.venv` 混用。

## CPU 识别时报 `ConvertPirAttribute2RuntimeAttribute` / oneDNN 错误

典型错误：

```text
NotImplementedError: (Unimplemented)
ConvertPirAttribute2RuntimeAttribute not support
[pir::ArrayAttribute<pir::DoubleAttribute>]
```

这是 PaddlePaddle 3.3.x CPU oneDNN/PIR 路径中的已知兼容性问题，不是图片、网络或后台接口导致的。

本项目当前固定：

```text
paddlepaddle==3.2.2
```

修复方式：

```powershell
cd tools\local-ocr
.\stop.ps1
.\.venv\Scripts\python.exe -m pip install --force-reinstall paddlepaddle==3.2.2
.\doctor.ps1
.\start.ps1
```

如果环境中依赖关系已经混乱，直接重建：

```powershell
.\stop.ps1
.\install.ps1 -Force
.\doctor.ps1
.\start.ps1
```

`doctor.ps1` 会明确检查 PaddlePaddle 是否为 3.2.2；CI 也会阻止未来把依赖重新放宽到当前有问题的 3.3.x。

## OCR 实际运行后提示“未返回 Markdown”

PaddleX 3.7.x 的 PP-StructureV3 可能返回字典型 MarkdownResult，其中正文位于：

```text
markdown_texts
```

而不是旧版假设的纯字符串。项目 `server.py` 已兼容：

- `markdown_texts`
- `markdown_text`
- `text`
- `markdown`
- 字符串与列表返回

如果重新出现该错误，先确认本地代码已经更新到包含 `_markdown_to_text()` 的版本，不要直接在业务层把返回值强制 `str()`。

## 浏览器 PNA 预检返回 400 / `Disallowed CORS private-network`

GitHub Pages 是公开 HTTPS 页面，而 OCR 服务是本机 loopback，因此 Chromium 会执行 Private Network Access 预检。

当前实现依赖 Starlette `CORSMiddleware` 原生：

```python
allow_private_network=True
```

不要恢复为“请求结束后手动补 `Access-Control-Allow-Private-Network` 响应头”的旧方案，因为 CORS 中间件可能已经在此之前拒绝 OPTIONS 请求。

正常预检应返回 `200`，并包含类似：

```text
access-control-allow-origin: https://clouderdream.github.io
access-control-allow-private-network: true
```

## `stop.ps1` 提示端口没运行，但服务实际还在

普通 Windows 权限下，`Get-NetTCPConnection` 在部分系统上可能返回“拒绝访问”。当前脚本会自动回退到：

```text
netstat -ano -p TCP
```

并且使用 `$processId`，避免与 PowerShell 内置只读变量 `$PID` 冲突。

脚本只会自动终止监听 `127.0.0.1:8765` 的 Python/PythonW 进程；若端口被其它程序占用会停止并提示，不会误杀其它进程。

## 模型被下载到用户目录 / Hugging Face 访问很慢

`start.ps1` 会把 PaddleX、Hugging Face、ModelScope 缓存指向项目：

```text
tools/local-ocr/models
```

并设置：

```text
PADDLE_PDX_MODEL_SOURCE=BOS
```

优先使用 Paddle 官方 BOS 模型源。`models/`、`cache/`、`output/` 均应保持在 `.gitignore` 中，不提交到仓库。

## 第一次识别很慢或内存较高

PP-StructureV3 会加载完整文档解析流水线和多个模型。首次运行还会下载模型，耗时、磁盘和内存占用都明显高于后续调用。

当前本机完整流水线验收时曾观察到数 GB 工作集与更高的私有提交量；这本身不等同于内存泄漏。闲置时建议执行：

```powershell
.\stop.ps1
```

如果未来需要长期常驻，应单独设计“轻量 OCR 模式”，而不是直接删除默认流水线能力。

## TikZ 结果不准确

当前只对线段和圆等简单几何做确定性检测。复杂手绘优先使用裁切 PNG/SVG，不要强行采用错误 TikZ。


## 浏览器提示 `signal is aborted without reason`

### 现象

后台能正常显示“已连接”，但识别密集手写整页或扫描 PDF 时，等待较长时间后出现：

```text
OCR 失败：signal is aborted without reason
```

### 根因

旧版后台把一次完整 PP-StructureV3 识别放在单个 `fetch('/ocr')` 请求里，并设置了 10 分钟 `AbortController` 超时。CPU 版 PP-StructureV3 处理高密度手写页时可能超过这个窗口，于是是**浏览器主动中断请求**，并不是 PaddleOCR 返回了该错误。

### 当前修复

V1.3 已改为异步任务模式：

```text
POST /ocr/start
  ↓
立即返回 job_id
  ↓
本机单线程队列执行 PP-StructureV3
  ↓
GET /ocr/status/<job_id> 轮询
  ↓
done → 返回 Markdown
```

这样长时间识别不再依赖一个持续 10 分钟的 HTTP 连接。状态检查短暂失败时，后台会自动重试，不会直接终止本机任务。

更新后请重启本地服务：

```powershell
cd G:\math-hut
git pull --ff-only origin main
cd tools\local-ocr
.\stop.ps1
.\start.ps1 -NoUpdate -NoBrowser
```

然后打开：

```text
http://127.0.0.1:8765/health
```

新版返回中应包含：

```json
"async_jobs": true
```

若仍然没有该字段，说明浏览器已经更新，但本机 Local OCR 服务仍是旧代码，需要重新启动。

