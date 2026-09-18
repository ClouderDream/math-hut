from __future__ import annotations

import base64
import io
import math
import os
import tempfile
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from pathlib import Path
from typing import Any, List

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps

app = FastAPI(title="Math Hut Local OCR", version="1.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://clouderdream.github.io", "http://localhost", "http://127.0.0.1"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$|https://clouderdream\.github\.io$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    # Starlette handles Chromium Private Network Access preflight internally.
    # This must be enabled here rather than appending the header after the
    # middleware has already accepted/rejected the OPTIONS request.
    allow_private_network=True,
)


@lru_cache(maxsize=1)
def get_pipeline():
    from paddleocr import PPStructureV3

    # PP-StructureV3 includes layout, OCR and formula recognition and can emit Markdown.
    # Models are downloaded by PaddleOCR/PaddleX on first use and then cached locally.
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


def _markdown_to_text(value: Any) -> str:
    """Normalize old/new PaddleX Markdown result shapes to plain Markdown text."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (list, tuple)):
        parts = [_markdown_to_text(item) for item in value]
        return "\n\n".join(part for part in parts if part).strip()
    if isinstance(value, dict):
        # PaddleX 3.7.x uses markdown_texts in MarkdownResult; older versions
        # have also exposed markdown_text / text / markdown.
        for key in ("markdown_texts", "markdown_text", "text", "markdown"):
            if key in value:
                text = _markdown_to_text(value.get(key))
                if text:
                    return text
        return ""

    # Some result wrappers are Mapping-like but are not literal dict objects.
    getter = getattr(value, "get", None)
    if callable(getter):
        for key in ("markdown_texts", "markdown_text", "text", "markdown"):
            try:
                text = _markdown_to_text(getter(key))
            except Exception:
                continue
            if text:
                return text
    return ""


def _collect_markdown(output, pipeline) -> str:
    pages: List[Any] = []
    for res in output:
        md = getattr(res, "markdown", None)
        if md is None and isinstance(res, dict):
            md = res
        if md is not None:
            pages.append(md)

    if not pages:
        return ""

    # Prefer PaddleX's own page concatenation so multi-page PDF reading order
    # remains consistent, but normalize its return type before calling strip().
    try:
        combined = pipeline.concatenate_markdown_pages(pages)
        text = _markdown_to_text(combined)
        if text:
            return text
    except Exception:
        pass

    # Compatibility fallback for PaddleX/PaddleOCR releases that expose
    # page-level dictionaries or strings directly.
    texts = [_markdown_to_text(md) for md in pages]
    return "\n\n".join(text for text in texts if text).strip()


_OCR_EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="math-hut-ocr")
_OCR_JOBS: dict[str, dict[str, Any]] = {}
_OCR_JOBS_LOCK = threading.Lock()
_OCR_JOB_TTL_SECONDS = 60 * 60


def _cleanup_ocr_jobs() -> None:
    """Drop completed job payloads after one hour so Markdown results do not leak memory."""
    cutoff = time.time() - _OCR_JOB_TTL_SECONDS
    with _OCR_JOBS_LOCK:
        stale = [
            job_id
            for job_id, job in _OCR_JOBS.items()
            if job.get("finished_at") and job["finished_at"] < cutoff
        ]
        for job_id in stale:
            _OCR_JOBS.pop(job_id, None)


def _update_ocr_job(job_id: str, **changes: Any) -> None:
    with _OCR_JOBS_LOCK:
        job = _OCR_JOBS.get(job_id)
        if job is not None:
            job.update(changes)


def _recognize_path(path: str) -> str:
    pipeline = get_pipeline()
    output = pipeline.predict(input=path)
    markdown = _collect_markdown(output, pipeline)
    if not markdown:
        raise RuntimeError("PaddleOCR 未返回 Markdown 内容")
    return markdown


def _run_ocr_job(job_id: str, path: str) -> None:
    _update_ocr_job(job_id, status="running", started_at=time.time())
    try:
        markdown = _recognize_path(path)
        _update_ocr_job(
            job_id,
            status="done",
            markdown=markdown,
            finished_at=time.time(),
        )
    except Exception as exc:
        _update_ocr_job(
            job_id,
            status="error",
            error=str(exc),
            finished_at=time.time(),
        )
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


async def _save_upload_for_ocr(file: UploadFile) -> str:
    data = await file.read()
    if not data:
        raise HTTPException(400, "空文件")
    if len(data) > 40 * 1024 * 1024:
        raise HTTPException(413, "文件超过 40MB")

    suffix = _suffix(file.filename or "upload", file.content_type)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(data)
        return temp_file.name


@app.post("/ocr/start")
async def ocr_start(file: UploadFile = File(...)):
    """Queue OCR and return immediately so the browser does not hold one long HTTP request."""
    _cleanup_ocr_jobs()
    path = await _save_upload_for_ocr(file)
    job_id = uuid.uuid4().hex
    with _OCR_JOBS_LOCK:
        _OCR_JOBS[job_id] = {
            "status": "queued",
            "created_at": time.time(),
            "filename": file.filename or "upload",
            "markdown": "",
            "error": "",
        }

    try:
        _OCR_EXECUTOR.submit(_run_ocr_job, job_id, path)
    except Exception:
        with _OCR_JOBS_LOCK:
            _OCR_JOBS.pop(job_id, None)
        try:
            os.unlink(path)
        except OSError:
            pass
        raise

    return {
        "ok": True,
        "job_id": job_id,
        "status": "queued",
        "engine": "PP-StructureV3",
    }


@app.get("/ocr/status/{job_id}")
def ocr_status(job_id: str):
    _cleanup_ocr_jobs()
    with _OCR_JOBS_LOCK:
        job = _OCR_JOBS.get(job_id)
        if job is None:
            raise HTTPException(404, "OCR 任务不存在或已过期")
        snapshot = dict(job)

    result = {
        "ok": snapshot["status"] != "error",
        "job_id": job_id,
        "status": snapshot["status"],
        "engine": "PP-StructureV3",
    }
    if snapshot["status"] == "done":
        result["markdown"] = snapshot.get("markdown", "")
    elif snapshot["status"] == "error":
        result["error"] = snapshot.get("error", "OCR 失败")
    return result


@app.get("/health")
def health():
    return {
        "ok": True,
        "engine": "PaddleOCR PP-StructureV3",
        "paid_api": False,
        "sketch": True,
        "async_jobs": True,\n        "sketch_guard": True,
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
        markdown = _recognize_path(tmp)
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
    width, height = image.size
    box = (
        int(width * x / 100.0),
        int(height * y / 100.0),
        int(width * (x + w) / 100.0),
        int(height * (y + h) / 100.0),
    )
    return image.crop(box)


def _basic_geometry(image: Image.Image):
    """Extract only simple geometry.

    Handwritten text/formulas create huge numbers of Hough primitives. V1.4
    measures region complexity first and refuses vectorization when the crop is
    text-heavy instead of returning a misleading SVG/TikZ reconstruction.
    """
    rgb = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    edges = cv2.Canny(gray, 70, 170)
    edge_density = float(np.count_nonzero(edges)) / float(max(1, edges.size))

    _, ink = cv2.threshold(
        gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )
    labels, _, stats, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)
    components = 0
    for idx in range(1, labels):
        area = int(stats[idx, cv2.CC_STAT_AREA])
        if 6 <= area <= max(80, int(ink.size * 0.08)):
            components += 1

    raw_lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=max(34, int(min(image.size) * 0.07)),
        minLineLength=max(26, int(min(image.size) * 0.11)),
        maxLineGap=max(7, int(min(image.size) * 0.025)),
    )
    raw_line_count = 0 if raw_lines is None else len(raw_lines)

    # Whole notebook pages and text-heavy crops are intentionally rejected.
    too_complex = (
        components > 120
        or edge_density > 0.145
        or raw_line_count > 70
    )

    analysis = {
        "components": components,
        "edge_density": round(edge_density, 5),
        "raw_lines": raw_line_count,
        "vectorizable": False,
    }
    if too_complex:
        return [], [], analysis

    # Deduplicate near-identical Hough segments.
    candidates = []
    if raw_lines is not None:
        for row in raw_lines[:120]:
            x1, y1, x2, y2 = map(int, row[0])
            length = math.hypot(x2 - x1, y2 - y1)
            if length < 24:
                continue
            if (x2, y2) < (x1, y1):
                x1, y1, x2, y2 = x2, y2, x1, y1
            angle = math.atan2(y2 - y1, x2 - x1) % math.pi
            mx, my = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            candidates.append((length, angle, mx, my, (x1, y1, x2, y2)))

    candidates.sort(reverse=True, key=lambda item: item[0])
    lines = []
    signatures = set()
    for length, angle, mx, my, line in candidates:
        key = (
            round(angle / 0.07),
            round(mx / 12.0),
            round(my / 12.0),
            round(length / 18.0),
        )
        if key in signatures:
            continue
        signatures.add(key)
        lines.append(line)
        if len(lines) >= 32:
            break

    circles = []
    min_side = min(image.size)
    if min_side >= 80 and components < 80:
        circles_raw = cv2.HoughCircles(
            gray,
            cv2.HOUGH_GRADIENT,
            dp=1.25,
            minDist=max(30, min_side // 5),
            param1=130,
            param2=40,
            minRadius=max(8, min_side // 28),
            maxRadius=max(14, min_side // 3),
        )
        if circles_raw is not None:
            accepted = []
            for cx, cy, radius in np.round(circles_raw[0, :12]).astype(int):
                duplicate = any(
                    math.hypot(cx - ax, cy - ay) < max(10, radius * 0.25)
                    and abs(radius - ar) < max(8, radius * 0.25)
                    for ax, ay, ar in accepted
                )
                if not duplicate:
                    accepted.append((int(cx), int(cy), int(radius)))
            circles = accepted[:8]

    vectorizable = bool(lines or circles)
    analysis["vectorizable"] = vectorizable
    analysis["lines"] = len(lines)
    analysis["circles"] = len(circles)
    return lines, circles, analysis

def _build_svg(width: int, height: int, lines, circles) -> str:
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}">',
        '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    ]
    for x1, y1, x2, y2 in lines:
        parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')
    for cx, cy, radius in circles:
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="{radius}"/>')
    parts.extend(["</g>", "</svg>"])
    return "\n".join(parts)


def _build_tikz(width: int, height: int, lines, circles) -> str:
    scale = max(width, height) or 1

    def tx(value):
        return round(8.0 * value / scale, 3)

    def ty(value):
        return round(8.0 * (height - value) / scale, 3)

    out = ["\\begin{tikzpicture}[line cap=round,line join=round]"]
    for x1, y1, x2, y2 in lines:
        out.append(f"  \\draw ({tx(x1)},{ty(y1)}) -- ({tx(x2)},{ty(y2)});")
    for cx, cy, radius in circles:
        out.append(f"  \\draw ({tx(cx)},{ty(cy)}) circle ({tx(radius)});")
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
    lines, circles, analysis = _basic_geometry(crop)
    vectorizable = bool(analysis.get("vectorizable"))
    svg = _build_svg(crop.width, crop.height, lines, circles) if vectorizable else ""
    tikz = _build_tikz(crop.width, crop.height, lines, circles) if vectorizable else ""

    buf = io.BytesIO()
    crop.save(buf, format="PNG", optimize=True)
    crop_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

    if vectorizable:
        warning = "选区复杂度较低，已生成基础 SVG/TikZ；仍请对照真实裁切图复核。"
    else:
        warning = "选区包含较多文字/笔画或结构过复杂，已停止伪矢量化；建议直接保存真实裁切图，或缩小框选范围后重试。"

    return JSONResponse(
        {
            "ok": True,
            "svg": svg,
            "tikz": tikz,
            "vectorizable": vectorizable,
            "crop_png_data_url": "data:image/png;base64," + crop_b64,
            "detected": {"lines": len(lines), "circles": len(circles)},
            "analysis": analysis,
            "warning": warning,
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8765, reload=False)
