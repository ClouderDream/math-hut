# 模型管理策略

GitHub 只保存代码、配置和模型选择，不保存大模型权重。

默认：
- OCR：PaddleOCR PP-StructureV3
- 公式：PP-StructureV3 内建链路
- 高级公式：未来可选 UniMERNet
- 草图：OpenCV 基础几何 + SVG/TikZ 回退

模型首次使用时由官方机制下载到本机缓存。这样避免 Git 仓库膨胀，也便于后续替换模型版本。
