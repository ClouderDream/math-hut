# GitHub 与本机职责分工

GitHub 保存：源码、安装/启动脚本、配置模板、版本历史、网站内容。

本机保存并执行：Python 虚拟环境、PaddleOCR 模型缓存、临时 OCR 文件、日志与实际推理。

GitHub Pages 不运行 Python OCR；后台通过 loopback 地址调用本机服务。
