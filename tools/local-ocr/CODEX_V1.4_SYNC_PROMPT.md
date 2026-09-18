# Codex：Math Hut V1.4 本机同步与验收

你现在在 Windows 电脑上操作 `ClouderDream/math-hut`。

## 固定路径

```text
G:\math-hut
```

## 目标

将本机仓库安全同步到当前 GitHub `main` 的 V1.4，重启已经存在的 Local OCR 服务，并验证：

- V1.4 已成为当前活跃网站版本；
- Local OCR 仍使用 PaddlePaddle 3.2.2；
- 异步 OCR 链路仍正常；
- 新的 `sketch_guard` 已生效；
- 整页手写笔记不会再被错误重建成大量虚假线/圆；
- 简单几何选区仍可输出 SVG/TikZ；
- 网站 OCR 页面布局符合 V1.4 设计。

不要重装已有环境，不要升级 PaddlePaddle，不要修改 V1.3。

---

## 1. 先检查 Git

```powershell
cd G:\math-hut
git status
git status --porcelain
git branch --show-current
git rev-parse HEAD
git fetch origin
git log --oneline -5 origin/main
```

要求：

- 当前分支必须为 `main`；
- 如果 working tree 不 clean，停止同步；
- 不允许 `git reset --hard`；
- 不允许静默覆盖本地修改；
- 若 clean，再执行：

```powershell
git pull --ff-only origin main
```

记录同步前后 HEAD。

---

## 2. 确认 V1.4 已切换

确认存在：

```text
G:\math-hut\v1.4
```

检查：

```powershell
Select-String -Path G:\math-hut\.github\workflows\deploy.yml -Pattern "v1.4"
Select-String -Path G:\math-hut\v1.4\site.config.js -Pattern "v1.4/content"
```

确认：

- Pages 构建目录是 `v1.4`；
- 后台 posts/images/pages/siteConfig 全部指向 `v1.4/content`；
- 不要修改 `v1.3`，它现在是历史稳定回滚版本。

---

## 3. 不要重装 OCR 环境

当前本机稳定环境应继续使用：

```text
Python 3.11.x
PaddlePaddle 3.2.2 CPU
PaddleOCR 3.7.x
PaddleX 3.7.x
```

禁止执行：

```powershell
.\install.ps1 -Force
```

除非真实诊断明确证明环境损坏。

禁止升级 PaddlePaddle 3.3.x。

---

## 4. 停止并重启 Local OCR

```powershell
cd G:\math-hut\tools\local-ocr

.\stop.ps1
.\doctor.ps1
.\start.ps1 -NoUpdate -NoBrowser
```

等待服务启动后：

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health | ConvertTo-Json -Depth 5
```

必须至少确认：

```json
{
  "ok": true,
  "engine": "PaddleOCR PP-StructureV3",
  "paid_api": false,
  "sketch": true,
  "async_jobs": true,
  "sketch_guard": true
}
```

如果没有 `sketch_guard: true`：

- 不要重新安装模型；
- 检查当前 HEAD；
- 检查旧 Python 进程是否真的停止；
- 检查正在运行的 `server.py` 是否来自 `G:\math-hut\tools\local-ocr`。

服务必须继续只监听：

```text
127.0.0.1:8765
```

不得改成 `0.0.0.0`。

---

## 5. 复验异步 OCR

使用现有验收图片（如果存在）：

```text
G:\math-hut\tools\local-ocr\output\acceptance\ocr-chinese-math.png
```

执行：

```text
POST /ocr/start
→ job_id
→ GET /ocr/status/{job_id}
→ queued / running / done
```

确认：

- 创建任务可以快速返回；
- Markdown 非空；
- 中文存在；
- 数学公式存在；
- 没有 timeout；
- 没有 abort；
- 没有 `signal is aborted without reason`。

不要自动“修正”OCR 输出后再作为原始结果记录。

---

## 6. 重点验证 V1.4 草图保护

这是本轮最重要的本机测试。

### 测试 A：复杂整页手写笔记

优先使用此前真实手写页：

```text
E:\Desktop\191057f4fe2b1c6f6ff42d25ebea1e2c.jpg
```

如果文件仍存在：

1. 使用整页或明显包含大量文字/公式的大选区请求 `POST /sketch`；
2. 记录响应中的：
   - `vectorizable`
   - `detected.lines`
   - `detected.circles`
   - `analysis.components`
   - `analysis.edge_density`
   - `analysis.raw_lines`
   - `crop_png_data_url`
   - `svg`
   - `tikz`

预期：

```text
crop_png_data_url 非空
vectorizable = false
SVG/TikZ 应为空或不提供可用伪重建
```

目标是确保整页文字不会再产生截图中那种大量虚假圆/线。

如果整页仍然 `vectorizable=true`：

- 不要自己调阈值；
- 保存完整 JSON；
- 在日志中记录分析指标；
- 交回 ChatGPT 调整。

### 测试 B：简单几何图

使用已有：

```text
G:\math-hut\tools\local-ocr\output\acceptance\sketch-geometry.png
```

或生成一个只有几条直线、三角形、矩形或圆的简单图。

调用 `POST /sketch`。

预期：

```text
crop_png_data_url 非空
vectorizable = true
SVG 非空
TikZ 非空
```

如果简单几何被错误拒绝：

- 不要自行放宽阈值；
- 记录 JSON 和图片尺寸；
- 交回 ChatGPT。

---

## 7. 浏览器 V1.4 UI 验收

打开：

```text
https://clouderdream.github.io/math-hut/admin/
```

先：

```text
Ctrl + F5
```

进入“OCR 导入”。

在桌面宽度（建议 1366px 和 1920px）检查：

1. “1. 上传原稿”和“2. 校对与排版”顶部对齐；
2. 两张卡片底部对齐；
3. 上传原稿区明显比右侧校对区窄；
4. 右侧同时显示：
   - Markdown 源码
   - 实时预览
5. 不需要再切换“Markdown / 预览”Tab；
6. 滚动 Markdown 时预览按相对进度同步；
7. 滚动预览时 Markdown 也同步；
8. 编辑 Markdown 后预览实时刷新。

再检查约 900px 宽：

- 页面不得发生明显重叠；
- 必要时自动变成单列布局。

---

## 8. 浏览器草图 UI 验收

上传一张真实笔记图片。

检查：

1. 草图区直接显示原图；
2. 可以用鼠标拖拽红框选取草图；
3. X / Y / 宽 / 高百分比会随着拖框自动更新；
4. 手工修改百分比时红框跟着更新；
5. 点击“分析所选草图”后，右侧第一优先显示**真实裁切 PNG**；
6. 不能再把生成的 Hough SVG 当成“原图预览”；
7. 复杂文字区：
   - 应显示无法可靠矢量化提示；
   - “保存 SVG”与“复制 TikZ”保持不可用；
   - “保存裁切 PNG”可用；
8. 单独框选简单几何草图后：
   - 如果服务判断可矢量化，SVG/TikZ 按钮恢复可用。

特别测试用户之前出现问题的场景：
不要把整页手写内容直接解释成几十条线、几十个圆。

---

## 9. 不要修改 tracked source

本轮原则上只做同步和验收。

如果发现新 Bug：

- 不要自行 commit；
- 不要自行 push；
- 不要随意调阈值；
- 记录：
  - 现象；
  - 复现步骤；
  - 浏览器尺寸；
  - API JSON；
  - 涉及文件；
  - 建议修改。

然后交回 ChatGPT。

---

## 10. 最终 Git 检查

```powershell
cd G:\math-hut
git status
git status --porcelain
```

必须保证：

```text
nothing to commit, working tree clean
```

以下内容不得进入 Git：

```text
.venv
models
cache
output
验收日志
测试截图
.env
config.local.*
```

---

## 11. 生成本机 V1.4 日志

创建：

```text
G:\math-hut\tools\local-ocr\output\acceptance\CODEX_V1.4_LOCAL_LOG_2026-09-18.md
```

该目录已被 Git 忽略，不要 commit。

日志必须包含：

# Math Hut V1.4 本机同步与 OCR/草图验收日志

## 1. Git
- 同步前 HEAD
- 同步后 HEAD
- origin/main
- git status

## 2. 环境
- Python
- PaddlePaddle
- PaddleOCR
- PaddleX
- OpenCV
- OCR PID
- 监听地址

## 3. /health
粘贴 JSON，并判断：
- async_jobs
- sketch_guard

## 4. 异步 OCR
- 测试文件
- job_id
- queued/running/done
- 总耗时
- Markdown 长度
- abort/timeout

## 5. 复杂整页草图保护
- 测试文件
- crop 范围
- vectorizable
- components
- edge_density
- raw_lines
- detected lines/circles
- crop PNG 是否存在
- SVG/TikZ 是否被正确阻止
- PASS / FAIL

## 6. 简单几何草图
- vectorizable
- lines
- circles
- SVG
- TikZ
- crop PNG
- PASS / FAIL

## 7. V1.4 后台 UI
分别记录 1920/1366/900px：
- 卡片上下对齐
- 左窄右宽
- Markdown/预览双栏
- 双向同步滚动
- 实时预览
- 草图拖框
- 真实裁切预览
- 复杂选区保护

## 8. 新问题
若无，写：
“未发现新的阻塞性问题。”

若有，记录复现和数据，不自行修代码。

## 9. 最终结论
- Git sync：PASS/FAIL
- health：PASS/FAIL
- async OCR：PASS/FAIL
- sketch guard complex：PASS/FAIL
- sketch simple geometry：PASS/FAIL
- V1.4 UI：PASS/FAIL
- git clean：PASS/FAIL
- Overall：PASS / PARTIAL PASS / FAIL

完成后告诉用户日志路径，并把该日志交给 ChatGPT。
