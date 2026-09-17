# Local OCR 安装验收清单

Codex 或人工完成本机配置后，至少验证以下项目：

- [ ] 仓库位于指定目录，`git status` 可正常执行。
- [ ] `tools/local-ocr/.venv/Scripts/python.exe` 存在。
- [ ] `python --version` 为 3.10 或 3.11。
- [ ] `fastapi`、`uvicorn`、`cv2`、`PIL`、`paddleocr`、`paddle` 可导入。
- [ ] `python -m py_compile server.py` 通过。
- [ ] `start.ps1 -NoBrowser` 可启动服务。
- [ ] `GET http://127.0.0.1:8765/health` 返回 `ok: true`。
- [ ] 网站后台 OCR 页面可以显示“已连接”。
- [ ] 使用一张 JPG/PNG 识别，返回 Markdown。
- [ ] 使用一张含简单草图的图片调用 `/sketch`，能返回 SVG/TikZ/crop。
- [ ] 停止服务后 8765 端口释放。
- [ ] `.venv`、缓存、日志没有出现在 `git status` 中。

## 不应发生

- 不把模型权重提交到 GitHub。
- 不把服务监听到 `0.0.0.0`。
- 不把 PAT、API Key、密码写入仓库。
- 不为了让识别“看起来正确”而自动改写数学结论。
