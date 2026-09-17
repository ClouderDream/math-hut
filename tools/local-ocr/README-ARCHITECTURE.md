# Local OCR 架构

```text
GitHub Pages /admin/
        ↓ localhost
127.0.0.1:8765 FastAPI
        ├─ PP-StructureV3 → Markdown/公式/版面
        └─ OpenCV Sketch → crop / SVG / TikZ
```

GitHub 托管源码与环境定义，本机负责推理和模型缓存。
