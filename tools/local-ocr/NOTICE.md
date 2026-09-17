# Local OCR 组件说明

本目录只提供本地集成代码，不重新分发第三方模型权重。

主要依赖：

- PaddleOCR / PP-StructureV3：OCR、版面、公式与 Markdown 链路。
- PaddlePaddle：推理运行时。
- OpenCV：基础草图几何检测。
- Pillow：图像读取、EXIF 方向修正与裁切。
- FastAPI / Uvicorn：仅监听 loopback 的本地 HTTP 服务。

第三方包及模型继续遵守各自许可证。模型首次使用时由官方依赖/模型下载机制获取并缓存到本机，不应提交进本仓库。
