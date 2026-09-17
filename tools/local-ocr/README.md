# Math Hut Local OCR

完全免费、开源、本地运行的 OCR/草图辅助服务。用于给 `math-hut` 后台 `/admin/` 提供：

- 中文/英文/手写文字识别；
- 数学公式识别与 Markdown 输出；
- 图片/PDF 解析；
- 草图裁切；
- 简单几何草图转 SVG；
- 简单几何草图转 TikZ。

不需要 Mathpix、API Key 或付费账号。

## 技术栈

- PaddleOCR `PP-StructureV3`：文档版面、OCR、公式识别、Markdown 输出。
- OpenCV：基础线段/圆检测。
- FastAPI：本机 HTTP API。
- Pillow：图像读取与裁切。

## Windows 安装

建议 Python 3.10 / 3.11，新建独立虚拟环境：

```powershell
cd tools\local-ocr
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
pip install -r requirements.txt
```

如果 `paddlepaddle` 因 CUDA / CPU 环境安装失败，请按 PaddlePaddle 官方安装页选择与你的显卡/CPU环境对应的 wheel，然后再次安装其余依赖。

## 启动

```powershell
cd tools\local-ocr
.\.venv\Scripts\Activate.ps1
python server.py
```

默认地址：

```text
http://127.0.0.1:8765
```

健康检查：

```text
http://127.0.0.1:8765/health
```

第一次执行 OCR 时 PaddleOCR 会下载模型，耗时和磁盘占用明显高于后续调用；模型会保存在本机缓存，不会进入 Git 仓库。

## API

### `GET /health`

后台用来判断本地服务是否启动。

### `POST /ocr`

multipart/form-data：

- `file`: JPG / PNG / WebP / TIFF / PDF

返回：

```json
{
  "ok": true,
  "markdown": "...",
  "engine": "PP-StructureV3"
}
```

### `POST /sketch`

multipart/form-data：

- `file`: 图片
- `x`: 裁切左上角 X，百分比，默认 0
- `y`: 裁切左上角 Y，百分比，默认 0
- `w`: 裁切宽度，百分比，默认 100
- `h`: 裁切高度，百分比，默认 100

返回：

- `svg`: 基础几何矢量 SVG
- `tikz`: TikZ 代码
- `crop_png_data_url`: 裁切图预览
- `detected.lines/circles`: 检测到的线段和圆数量

## 草图策略

当前 TikZ 转换属于“基础几何模式”，适合：

- 坐标轴；
- 直线/线段；
- 三角形；
- 矩形；
- 圆；
- 简单几何示意图。

以下内容不应强行自动 TikZ：

- 手写文字标签；
- 很复杂的曲线；
- 大量箭头与注释；
- 自由手绘示意图；
- 重叠严重的笔迹。

对于这些情况，优先：

1. 裁切原图；
2. 保留 PNG；或
3. 使用 SVG 矢量结果并人工整理。

TikZ 主要作为“可编辑源代码”，网站正文仍优先显示 SVG/图片，因为浏览器端 KaTeX 不会执行完整 TikZ。

## 安全与隐私

- 服务只监听 `127.0.0.1`，不对局域网或公网开放。
- 图片/PDF 在本机处理，不上传第三方 OCR 平台。
- 后台只通过 localhost 调用。
- 不需要任何 OCR API Key。

## 后续计划

- 为复杂手写公式增加 UniMERNet 可选增强模式；
- 增加浏览器可视化拖拽裁切框；
- 增加箭头/坐标轴/函数曲线结构识别；
- 对实验性的 sketch-to-TikZ 模型增加独立可选后端，而不替换稳定 SVG 回退链路。
