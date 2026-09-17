from __future__ import annotations

import base64
import io
import math
import os
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import List

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps

app = FastAPI(title="Math Hut Local OCR", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://clouderdream.github.io", "http://localhost", "http://127.0.0.1"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$|https://clouderdream\.github\.io$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def private_network_access_header(request, call_next):
    response = await call_next(request)
    # Chromium Private Network Access preflight compatibility for a public HTTPS page
    # talking to loopback localhost.
    if request.headers.get("access-control-request-private-network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


@lru_cache(maxsize=1)
def get_pipeline():
    from paddleocr import PPStructureV3

    # PP-StructureV3 includes layout, OCR and formula recognition and can emit Markdown.
    # Models are downloaded by PaddleOCR on first use and then cached locally.
    return PPStructureV3(
        use_doc_orientation_classify=True,
        use_doc_unwarping=True,
        use_textline_orientation=True,
    )


def _suffix(name: str, content_type: str | None) -> str:
    ext = Path(name or "").suffix.lower()
    if ext:
        return ext
    mapping = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/tiff": ".tiff",
    }
    return mapping.get(content_type or "", ".bin")


def _collect_markdown(output, pipeline) -> str:
    pages = []
    for res in output:
        md = getattr(res, "markdown", None)
        if md:
            pages.append(md)
    if not pages:
        return ""
    try:
        return pipeline.concatenate_markdown_pages(pages).strip()
    except Exception:
        texts: List[str] = []
        for md in pages:
            if isinstance(md, str):
                texts.append(md)
            elif isinstance(md, dict):
                texts.append(
                    str(
                        md.get("markdown_text")
                        or md.get("text")
                        or md.get("markdown")
                        or ""
                    )
                )
        return "\n\n".join(x for x in texts if x).strip()


@app.get("/health")
def health():
    return {
        "ok": True,
        "engine": "PaddleOCR PP-StructureV3",
        "paid_api": False,
        "sketch": True,
    }


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(400, "空文件")
    if len(data) > 40 * 1024 * 1024:
        raise HTTPException(413, "文件超过 40MB")

    suffix = _suffix(file.filename or "upload", file.content_type)
    tmp = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            f.write(data)
            tmp = f.name
        pipeline = get_pipeline()
        output = pipeline.predict(input=tmp)
        markdown = _collect_markdown(output, pipeline)
        if not markdown:
            raise RuntimeError("PaddleOCR 未返回 Markdown 内容")
        return {
            "ok": True,
            "markdown": markdown,
            "engine": "PP-StructureV3",
        }
    except Exception as exc:
        raise HTTPException(500, f"OCR 失败：{exc}")
    finally:
        if tmp and os.path.exists(tmp):
            try:
                os.unlink(tmp)
            except OSError:
                pass


def _crop_image(image: Image.Image, x: float, y: float, w: float, h: float) -> Image.Image:
    x = max(0.0, min(100.0, x))
    y = max(0.0, min(100.0, y))
    w = max(1.0, min(100.0 - x, w))
    h = max(1.0, min(100.0 - y, h))
    W, H = image.size
    box = (
        int(W * x / 100.0),
        int(H * y / 100.0),
        int(W * (x + w) / 100.0),
        int(H * (y + h) / 100.0),
    )
    return image.crop(box)


def _svg_escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _basic_geometry(image: Image.Image):
    rgb = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    edges = cv2.Canny(gray, 60, 160)

    raw_lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=max(35, int(min(image.size) * 0.08)),
        minLineLength=max(24, int(min(image.size) * 0.10)),
        maxLineGap=max(8, int(min(image.size) * 0.03)),
    )
    lines = []
    if raw_lines is not None:
        for row in raw_lines[:80]:
            x1, y1, x2, y2 = map(int, row[0])
            if math.hypot(x2 - x1, y2 - y1) >= 20:
                lines.append((x1, y1, x2, y2))

    circles_raw = cv2.HoughCircles(
        gray,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=max(20, min(image.size) // 8),
        param1=120,
        param2=28,
        minRadius=max(5, min(image.size) // 40),
        maxRadius=max(10, min(image.size) // 3),
    )
    circles = []
    if circles_raw is not None:
        for c in np.round(circles_raw[0, :20]).astype(int):
            circles.append(tuple(map(int, c)))

    return lines, circles


def _build_svg(width: int, height: int, lines, circles) -> str:
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}">',
        '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    ]
    for x1, y1, x2, y2 in lines:
        parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')
    for cx, cy, r in circles:
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}"/>')
    parts.extend(["</g>", "</svg>"])
    return "\n".join(parts)


def _build_tikz(width: int, height: int, lines, circles) -> str:
    scale = max(width, height) or 1

    def tx(v):
        return round(8.0 * v / scale, 3)

    def ty(v):
        return round(8.0 * (height - v) / scale, 3)

    out = ["\\begin{tikzpicture}[line cap=round,line join=round]"]
    for x1, y1, x2, y2 in lines:
        out.append(f"  \\draw ({tx(x1)},{ty(y1)}) -- ({tx(x2)},{ty(y2)});")
    for cx, cy, r in circles:
        out.append(f"  \\draw ({tx(cx)},{ty(cy)}) circle ({tx(r)});")
    out.append("\\end{tikzpicture}")
    return "\n".join(out)


@app.post("/sketch")
async def sketch(
    file: UploadFile = File(...),
    x: float = Form(0),
    y: float = Form(0),
    w: float = Form(100),
    h: float = Form(100),
):
    data = await file.read()
    if not data:
        raise HTTPException(400, "空文件")
    try:
        image = Image.open(io.BytesIO(data))
        image = ImageOps.exif_transpose(image).convert("RGB")
    except Exception as exc:
        raise HTTPException(400, f"草图必须是可读取的图片：{exc}")

    crop = _crop_image(image, x, y, w, h)
    lines, circles = _basic_geometry(crop)
    svg = _build_svg(crop.width, crop.height, lines, circles)
    tikz = _build_tikz(crop.width, crop.height, lines, circles)

    buf = io.BytesIO()
    crop.save(buf, format="PNG", optimize=True)
    crop_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

    return JSONResponse(
        {
            "ok": True,
            "svg": svg,
            "tikz": tikz,
            "crop_png_data_url": "data:image/png;base64," + crop_b64,
            "detected": {"lines": len(lines), "circles": len(circles)},
            "warning": "TikZ 为基础几何检测结果；复杂曲线、手写文字与箭头请优先使用裁切图或 SVG 并人工校对。",
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8765, reload=False)
