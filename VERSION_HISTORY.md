# 云梦的数理小屋 · 版本历史与架构说明

> 本文件是项目的长期维护日志。以后每轮重要对话改动都应在对应版本下记录：改了什么、为什么改、出现过什么 Bug、如何修复、哪些设计优点必须保留，以及当前架构如何实现。
>
> 版本命名规则：`V1.x` 为当前纯静态博客 + 浏览器后台体系；未来如果发生明显架构跃迁，可进入 `V2.x`、`V3.x`，而不是无限堆叠 V1.x。

---

# V1.x

## V1.0 · 初始静态博客

### 目标
- 建立“云梦的数理小屋”个人数学/物理笔记站。
- Markdown 写作，KaTeX 渲染公式。
- 纯静态部署到 GitHub Pages。

### 架构
- Node.js 生成器。
- EJS 模板。
- Markdown 内容源。
- GitHub Pages 承担最终托管。

### 希望长期保留
- 静态站优先，不引入不必要数据库。
- 数学公式是一等公民。
- 源内容长期可迁移，不与某个 CMS 强绑定。

---

## V1.1 · 浏览器后台与 GitHub Contents API

### 主要改动
- 增加 `/admin/` 浏览器后台。
- 后台直接调用 GitHub Contents API 读取、保存、删除 Markdown 和图片。
- GitHub PAT 成为真正的仓库写入凭据。
- 增加文章、页面、媒体库、站点设置等基础管理能力。
- 增加 Markdown 实时预览、KaTeX、代码高亮和图片上传。

### 认证模型
- 管理口令：浏览器本地门槛，不是真正安全边界。
- GitHub PAT：真正的写权限凭据。
- GitHub Actions / Pages：与浏览器 PAT 分离的部署身份。

### 发现过的安全问题与修复
1. Markdown 预览最初允许 `html: true`，并写入 `innerHTML`。
   - 风险：如果恶意 HTML 被执行，可能读取 Web Storage 中的 PAT。
   - 修复：统一改为 `html: false`。
2. Token 可长期保存在浏览器。
   - 调整为“信任此电脑”显式选择；个人电脑可长期信任，公共电脑不应开启。
3. 文档曾推荐 Classic PAT `repo` 全权限。
   - 后续统一建议 Fine-grained PAT，只授权 `math-hut` 仓库与 Contents Read/Write。

### 希望长期保留
- 不建设传统服务端账号系统。
- GitHub 本身继续作为内容数据库和版本历史。
- 后台的每次编辑天然形成 Git commit，可回滚。

---

## V1.2 · 视觉与后台体验迭代

### 主要改动
- 前台逐步从传统博客模板风格转向 Editorial / 个人学术主页风格。
- 暖纸色背景、墨蓝主色、Serif 标题与 Sans 正文形成统一设计语言。
- 后台逐步与前台共享同一视觉体系。
- 加入更完整的文章编辑工具栏和数学符号输入。

### 希望长期保留
- 不使用过多渐变、玻璃拟态、彩色卡片。
- 保持“现代个人学术主页 + 数学手记”的克制风格。
- UI 改动优先提升阅读和编辑效率，而不是堆装饰。

---

## V1.3 · 当前活跃架构

### 前台
- Editorial 首页。
- 数学/物理文章与科研前沿简报分流。
- 独立 `/research/` 科研前沿栏目。
- 标签、归档、搜索、RSS、sitemap。
- 文章阅读进度、目录高亮。
- 手机端全屏导航菜单。
- 页面背景加入低透明度数学/物理元素，如 `∫`、`∑`、`e^{iπ}+1=0`、`ψ(x)`、`∇` 和薛定谔方程。

### 后台
- 文章管理。
- 独立“简报”入口。
- “页面”入口改为“关于”，只维护 `about.md`。
- 媒体库。
- 快捷键设置。
- 站点设置。
- OCR 导入工作区。
- 全局保存/上传进度条。
- 图片按文章 slug 建目录：`content/images/<slug>/...`。

### 站点设置
固定内容统一用表单维护，不要求直接写 JSON：
- 基础信息。
- 首页 Hero。
- 导航菜单。
- 社交联系。
- 页脚。

“关于本站”不再重复出现在站点设置中，统一由顶部“关于”入口维护。

### 图片管理
- 正文图片优先按文章 slug 分目录。
- `_shared`：跨文章通用资源。
- `_site`：站点级资源。
- 支持选择、拖拽、粘贴上传并自动插入 Markdown。
- 科研简报图片：只有“直接相关 + 权威来源 + 许可适合”才展示；否则允许缺省，不在网站正文解释版权/上传失败原因。

### 科研前沿每日简报
- 每日任务生成 5 条科研前沿。
- 自动同步为网站文章。
- 固定标签：`科研前沿`、`每日简报`。
- 不挤占普通数学/物理首页。
- 自动进入 `/research/`、搜索、归档、RSS、sitemap。
- 历史简报已回填 2026-09-08 至 2026-09-13，9 月 14 日没有实际简报则不虚构。

### 配图规则
- 不再生成无关 AI 图或原创示意图替代真实新闻图片。
- 优先论文/期刊/大学/研究机构官方直接相关图片。
- 明确许可允许复用时，可本地化或使用官方稳定派生图。
- Nature / Springer Nature 可优先检查官方 `media.springernature.com` 网页派生图。
- 图片加载优先使用网页派生尺寸；正文首图优先加载，其余图片 lazy load。

### GitHub Pages 与 CI
构建链路：

```text
push main
  ↓
npm ci
  ↓
npm run build
  ↓
npm run test:smoke
  ↓
上传 Pages artifact
  ↓
deploy
```

冒烟测试覆盖：
- 关键产物是否存在。
- JS 语法。
- 内部链接。
- 重复 id。
- 科研简报是否进入科研栏目且不刷普通首页。
- RSS / sitemap / search 是否收录。
- 移动菜单关键逻辑。
- 后台高风险 MutationObserver 回归模式。

Pages 并发采用“新提交取消旧部署”的策略，避免频繁后台保存导致旧版本依次排队。

### 重大 Bug：后台内存泄漏

#### 现象
打开后台后 Edge renderer 内存迅速增长到 20GB 以上，最终系统接近卡死。

#### 根因
`admin-responsive-about.js` 曾监听整个 tabs 子树；Observer 回调无条件执行：

```js
tab.textContent = '关于'
```

而写 `textContent` 本身再次触发 MutationObserver，形成无限 DOM mutation 自反馈循环。

#### 修复
- 删除 tabs 子树 MutationObserver。
- `textContent` 只有值真的变化时才修改。
- 关于页轮询 timer 保证同时只有一个，并在离开页面时清理。
- 列表元数据读取限制并发数。
- 列表 Observer 只监听直接 `childList`，不监听自身内部文字变化。
- CI 增加 MutationObserver 内存泄漏模式检测。

#### 必须保留的原则
任何动态 UI 增强不得采用“Observer 监听自己会修改的节点 + 回调再次无条件修改该节点”的模式。

---

## V1.3 OCR · 免费开源本地识别方向

### 原 Mathpix 方案的问题
- 需要第三方账号/API Key。
- 商业计费模式不适合长期个人笔记工作流。
- 手写笔记需要上传第三方服务。

### 新目标
OCR 主链路必须满足：
- 完全免费。
- 开源。
- 本机运行。
- 图片/PDF 不必离开用户电脑。
- 中文手写、数学公式、版面、草图可以分别处理。
- 后台只负责上传、校对与插入文章，不在浏览器加载大型模型。

### 推荐架构

```text
GitHub Pages /admin/
        │
        │ HTTP localhost
        ▼
http://127.0.0.1:8765
        │
        ├─ PP-StructureV3 / PP-OCRv5
        │    ├─ 中文/英文/手写文字
        │    ├─ 公式识别
        │    ├─ 版面顺序
        │    └─ Markdown
        │
        └─ Sketch Pipeline
             ├─ 手动裁切
             ├─ OpenCV 基础几何检测
             ├─ SVG 输出
             └─ 简单图形 TikZ 输出
```

### OCR 引擎选择
默认优先 PaddleOCR `PP-StructureV3`：
- 支持图片和 PDF。
- 可以直接输出 Markdown。
- 内含 OCR、版面与公式识别链路。
- 复杂手写公式后续可单独接 UniMERNet 强化。

可选备用：
- Pix2Text：更接近开源 Mathpix 替代品，部署简单。
- MinerU：适合几十页扫描 PDF、教材和论文批处理，但更重。

### 草图处理策略
草图不应“一律强行转 TikZ”。按可靠性分层：

1. **保真模式（默认）**
   - 手动裁切草图区域。
   - 保留为裁切图片或转 SVG。
   - 适合复杂随手图、曲线、示意箭头、难以结构化的草图。

2. **基础 TikZ 模式**
   - 用 OpenCV 检测直线、圆等基本几何元素。
   - 生成可编辑 `\draw` TikZ。
   - 适合坐标轴、三角形、矩形、圆、简单函数示意等。

3. **高级 Image/Sketch → TikZ（实验性）**
   - SkeTikZ / IMGTikZ、DaVinci/DeTikZify 等研究路线可作为未来 V2.x 候选。
   - 当前不作为默认生产链路，因为手绘图直接生成语义正确 TikZ 的可靠性仍不足。

### TikZ 与网站显示
浏览器前台不直接编译 TikZ，因此草图转换结果同时保留：
- SVG：直接用于网站展示。
- TikZ：作为可编辑源代码，用于 LaTeX/PDF/论文排版。

### 设计原则
- 数学 OCR 永远不自动直接发布。
- 必须保留“原图 | Markdown | 预览”的人工校对流程。
- `<`、`≤`、`>`、`≥`、`-`、`=`、`f`、`f'` 等关键数学符号必须重点人工核对。
- 草图 TikZ 识别失败时宁可回退到 SVG/裁切图，不生成看似整洁但语义错误的图。

### 2026-09-17 · GitHub 托管 + 本机执行的一键 OCR 工具链

#### 用户目标
- GitHub 保存本地 OCR 所需代码、脚本、配置模板和版本说明。
- 用户电脑只负责实际模型推理和模型缓存。
- 通过 Codex 在指定 Windows 目录一键完成 clone / 安装 / 联调。

#### 实际修改
- `tools/local-ocr` 增加 `bootstrap.ps1`：可将仓库克隆/更新到指定目录并初始化环境。
- 增加 `install.ps1/.cmd`：自动寻找 Python 3.11/3.10、创建 `.venv`、安装依赖并做模块校验。
- 增加 `start.ps1/.cmd`、`stop.ps1/.cmd`、`update.ps1`、`doctor.ps1/.cmd`。
- 增加 `.gitignore`，排除 `.venv`、模型、缓存、日志和本地配置。
- 增加 `config.example.yaml`、`.env.example` 与 Windows/Codex/验收说明。
- `requirements.txt` 改为安装 `paddleocr[doc-parser]`，保证 PP-StructureV3 文档解析能力依赖完整。
- 增加 `.github/workflows/local-ocr-check.yml`，在 GitHub 自动检查 Python / PowerShell 语法、关键文件、`doc-parser` 依赖与 loopback 安全边界。

#### Bug / 风险
- 初版 `install.ps1` 对单词命令 `python` 的参数切分可能产生错误数组范围。
- PP-StructureV3 在新版 PaddleOCR 中属于 `doc-parser` 能力域，只安装基础 `paddleocr` 可能在本机缺少依赖。
- 为解决浏览器联调问题不能把服务简单改为 `0.0.0.0`，否则会扩大局域网暴露面。

#### 修复方式
- 重写 Python 启动命令解析，明确兼容 `py -3.11`、`py -3.10` 和 `python`。
- 安装后强制执行 `py_compile` 与关键模块 import 校验。
- CI 固化 `127.0.0.1` 默认监听约束。
- 本地与 GitHub 职责分离：大模型权重不进入 Git，首次使用由官方机制下载到本机缓存。

#### 希望长期保留
- GitHub 托管“可复现的环境定义”，本机执行实际 AI 推理。
- OCR 永久保持免费/开源主链路，不回退到必须付费的 API 模式。
- 本地服务默认 loopback-only。
- Codex 优先执行仓库现有脚本，不重复另造一套环境。
- 模型、`.venv`、日志、测试图片、密钥不得进入 Git。

#### 相关文件
- `tools/local-ocr/`
- `.github/workflows/local-ocr-check.yml`
- `tools/local-ocr/CODEX_LOCAL_SETUP_PROMPT.md`
- `tools/local-ocr/LOCAL_SETUP_CHECKLIST.md`


### 2026-09-18 · 本机 OCR 实测收口与长任务中断修复

#### 用户目标
- 将本机实际验收通过的 PaddleOCR / PP-StructureV3 修复稳定回灌到 GitHub。
- 修复 `doctor.ps1` 将正常 PaddlePaddle 3.2.2 误判为失败的问题。
- 修复复杂整页手写 OCR 等待较久后出现 `signal is aborted without reason`。

#### 实际修改
- `doctor.ps1` 不再通过 `import paddle; print(paddle.__version__)` 并合并 stderr 读取版本，而改用 `importlib.metadata.version('paddlepaddle')`，避免 ccache/oneDNN 提示污染版本字符串。
- Local OCR 服务增加异步长任务接口：
  - `POST /ocr/start` 创建识别任务并立即返回 `job_id`。
  - `GET /ocr/status/{job_id}` 查询 queued/running/done/error 状态。
- OCR 使用单 worker 队列，避免同时启动多个完整 PP-StructureV3 推理造成内存峰值叠加。
- 已完成任务结果保留 1 小时后自动清理，防止 Markdown 结果长期滞留内存。
- 后台 OCR 页面改为“创建任务 + 状态轮询”，不再依赖一个最长 10 分钟的单次 `fetch('/ocr')`。
- 状态查询发生短暂网络错误时自动重试，避免误判本机正在运行的任务已经失败。
- 旧版 Local OCR 服务仍可回退到 `/ocr` 兼容模式，便于网站和本机代码不同步时过渡。
- Local OCR CI 增加异步任务链路防回归检查。

#### Bug / 风险
1. `doctor.ps1` 曾使用 `2>&1` 合并 Paddle import 的 stderr，导致 `ccache` 提示和 `3.2.2` 一起参与字符串比较，产生假阴性。
2. 旧后台将 PP-StructureV3 完整推理塞进一个 10 分钟浏览器请求；复杂手写页在 CPU 上可能超过窗口，前端 `AbortController` 主动终止后只显示模糊的 `signal is aborted without reason`。
3. 完整 PP-StructureV3 常驻内存较高，不能通过并行启动多个识别任务来“加速”，否则会显著放大内存压力。

#### 修复方式
- 版本检测读取 Python 包元数据，而不是解析第三方库 import 日志。
- 长耗时推理从“浏览器长连接”改为“本地任务队列 + 短轮询请求”。
- PP-StructureV3 保持单 worker 顺序执行；浏览器只负责状态展示与结果校对。
- CI 固化 `/ocr/start`、`/ocr/status/{job_id}` 和前端轮询链路，阻止重新引入 10 分钟硬中断。

#### 希望长期保留
- PaddlePaddle CPU 基线继续固定 `3.2.2`，直到上游 3.3.x oneDNN/PIR 回归有明确验证通过的新版本。
- OCR 结果必须人工校对后再进入文章。
- 本地服务仍只监听 `127.0.0.1`。
- 高内存模型采用单任务队列，不用并发推理换取表面速度。
- 长任务 UI 必须采用可恢复/可轮询状态，不再让浏览器超时决定推理生命周期。

#### 相关文件
- `tools/local-ocr/server.py`
- `tools/local-ocr/doctor.ps1`
- `tools/local-ocr/README-TROUBLESHOOTING.md`
- `v1.3/src/admin/ocr-workspace.js`
- `.github/workflows/local-ocr-check.yml`

#### 回滚点
- `restore-before-doctor-version-fix-2026-09-17`
- `restore-before-ocr-job-fix-2026-09-18`

---


# V1.4

## 2026-09-18 · OCR 校对工作台与草图流程重构

### 用户目标
- OCR 上传区与校对区顶部、底部对齐。
- 缩小“上传原稿”宽度，把更多空间给校对工作区。
- Markdown 源码与实时预览同时显示为两栏，并支持滚轮同步阅读。
- 修复草图功能把整页手写文字误识别为大量圆/线的问题。
- 草图操作从百分比盲填改为直接在原图上拖拽框选。
- 将这一阶段作为独立 V1.4 发布，V1.3 保留为稳定回滚版本。

### 实际修改
- 新建 `v1.4/`，以当时稳定 `v1.3/` 为完整基线复制。
- GitHub Pages 构建、后台文章/图片写入目录和 CI 切换到 `v1.4`。
- OCR 主区桌面布局改为较窄上传区 + 较宽校对区，两张卡片使用 stretch 对齐上下边缘。
- 校对区取消“Markdown/预览二选一 Tab”，改为永久双栏：
  - 左：Markdown 源码；
  - 右：实时 Markdown + KaTeX 预览；
  - 两栏按相对阅读进度双向同步滚动；
  - Markdown 编辑时预览自动刷新。
- 草图工作区增加可视化拖拽框选，自动回写 X/Y/宽/高百分比，同时保留数字精调。
- 草图服务始终先返回真实 `crop_png_data_url`，后台默认展示真实裁切结果，不再把 Hough 重建图冒充原图。
- `server.py` 增加复杂度保护：
  - 计算连通区域数量、边缘密度和原始 Hough 线数量；
  - 对文字密集、整页笔记或复杂结构选区直接设置 `vectorizable=false`；
  - 复杂选区不生成 SVG/TikZ，建议保存真实裁切图或缩小选区；
  - 简单选区才进行去重后的线段/圆检测并输出 SVG/TikZ。
- Local OCR `/health` 增加 `sketch_guard=true`。
- V1.4 smoke test 与 Local OCR CI 增加双栏校对、同步滚动、框选器和 safe sketch guard 防回归检查。
- 根 README、Agent 工作约定和部署入口更新到 V1.4。

### Bug / 根因
1. **草图输出与原图完全不符**
   - 原因：旧版直接对整页或大选区执行 HoughLinesP/HoughCircles。
   - 中文笔画、数字、公式、括号和字圈都可能被识别为直线/圆，最终生成大量不存在的几何元素。
2. **草图选择方式不适合日常使用**
   - 原因：只提供 X/Y/宽/高百分比输入，用户必须猜选区。
3. **OCR 校对空间利用率低**
   - 原因：上传区占宽偏大，Markdown 与预览需要切换，无法在修正文稿时同时观察排版。
4. **版本职责开始混杂**
   - 原因：V1.3 已成为稳定 OCR 基线，继续大改会降低回滚清晰度。

### 修复原则
- “真实裁切图”是草图处理的事实基准；任何矢量化结果都只是可选派生物。
- 复杂草图宁可不给 TikZ，也不能输出看似整齐但语义错误的图。
- OCR 校对必须允许同时看到源码和渲染结果。
- 大的交互重构进入新版本目录，历史稳定版本不覆盖、不删除。

### 希望长期保留
- V1.3 作为进入 V1.4 前的完整稳定回滚点。
- PaddlePaddle 3.2.2 CPU 稳定基线和异步单 worker OCR 队列。
- OCR 结果人工校对后才进入文章。
- 草图“框选 → 真实裁切预览 → 简单才矢量化”的工作流。
- Markdown / 预览同步滚动。
- 后台在不同分辨率下自动降级为单列布局。
- Local OCR 仅监听 `127.0.0.1`。

### 相关文件
- `v1.4/`
- `v1.4/src/admin/ocr-workspace.js`
- `v1.4/site.config.js`
- `v1.4/scripts/smoke-test.js`
- `tools/local-ocr/server.py`
- `.github/workflows/deploy.yml`
- `.github/workflows/local-ocr-check.yml`
- `.agent`
- `README.md`

### 回滚点
- `restore-before-v1.4-ocr-ui-2026-09-18`

---

# V2.x（预留）

进入 V2.x 的条件应是架构级变化，而不是普通 UI 修改。例如：
- 正式加入稳定的本地辅助服务体系。
- OCR、图形解析、全文索引等由统一本地服务管理。
- 内容工作流从“纯 GitHub Contents API”升级为更完整但仍可回滚的数据层。

V2.x 应继续保留：
- Markdown 内容可迁移。
- Git 历史与回滚。
- 数学公式优先。
- 前台 Editorial 视觉语言。
- 不为技术炫技牺牲个人使用效率。

---

# V3.x（预留）

只有当站点从个人静态博客进一步演化为“个人知识库 / 研究工作台 / 多端同步系统”时再进入 V3.x。

可能方向：
- 本地知识库与网站双向同步。
- 笔记 OCR、论文阅读、科研简报、错题管理统一工作流。
- 更成熟的多模态笔记解析和结构化知识图谱。

---

# 每次对话后的维护模板

以后重要改动请在对应版本下追加以下内容：

```markdown
### YYYY-MM-DD · 改动名称

#### 用户目标
- ...

#### 实际修改
- ...

#### Bug / 风险
- ...

#### 修复方式
- ...

#### 希望长期保留
- ...

#### 相关文件
- `...`

#### 回滚点
- `restore-...`
```

不要只记录“改了 UI”。需要写清楚修改原因、实现机制和未来维护时不能破坏的约束。
