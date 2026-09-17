# 缓存说明

PaddleOCR 模型首次使用时会由官方机制下载并缓存到本机。缓存不属于 GitHub 仓库的一部分。

不要把模型目录复制到 `tools/local-ocr/models/` 后提交；若需要固定模型版本，应在配置或 requirements 中记录版本，而不是提交权重。
