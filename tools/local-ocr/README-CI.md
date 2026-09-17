# Local OCR GitHub CI

`.github/workflows/local-ocr-check.yml` 会在 `tools/local-ocr/**` 发生变化时执行轻量源码检查：

- `server.py` Python 语法；
- 所有 PowerShell 脚本语法；
- 必需工具文件是否存在；
- `paddleocr[doc-parser]` 是否声明；
- 默认监听是否保持 loopback-only。

CI 不下载 PaddleOCR 大模型，不执行实际 OCR 推理；真实推理验收仍在本机完成。
