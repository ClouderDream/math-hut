# 技术选型：Web 端数学公式渲染，为什么选 KaTeX

> 面向「云梦的数理小屋」个人博客。结论先行：**选 KaTeX，且在构建期预渲染**。
> 本文同时说明它的边界，以及在什么情况下应该改用 MathJax 或服务端 LaTeX。

---

## 一、先纠偏：这不是同一类东西的比

「KaTeX 还是 LaTeX」这个问法本身有偏差，因为二者不在同一层：

| 名称 | 是什么 | 输入 → 输出 | 运行位置 |
|---|---|---|---|
| **TeX** | 排版引擎（1978，Knuth） | `.tex` → `.dvi` | 本地命令行 |
| **LaTeX** | 基于 TeX 的**宏包/排版系统**（1984，Lamport） | `.tex` → `.pdf` | 本地 / 服务器，需要完整发行版 |
| **MathJax** | 用 JS 实现的**公式渲染库** | LaTeX 片段 → HTML/CSS/SVG/MathML | 浏览器（也可 Node 端） |
| **KaTeX** | 用 JS 实现的**公式渲染库**（Khan Academy） | LaTeX 片段 → HTML/CSS（+MathML） | 浏览器或 Node |

谱系关系：

```
        TeX（排版引擎）
          │
          ├── LaTeX（宏包集合，面向文档排版）── pdflatex ──► PDF
          │                                  └─ dvisvgm ──► SVG
          │
          └── Web 时代的重新实现（只取数学子集）
                ├── MathJax  ──► HTML-CSS / SVG / MathML
                └── KaTeX    ──► HTML+CSS（+MathML）
```

所以 Web 场景真正可比的是**三条路线**：

1. **KaTeX**（客户端或构建期）
2. **MathJax**（客户端）
3. **服务端 LaTeX → SVG**（`pdflatex` + `dvisvgm`，或 MathJax Node 端）

---

## 二、九维度对比

| 维度 | KaTeX | MathJax v3 | 服务端 LaTeX→SVG |
|---|---|---|---|
| **渲染原理** | 自写解析器 + 布局算法，直接输出带定位的 HTML `<span>` + CSS | 解析 LaTeX → 内部 MathML → 排版输出（HTML-CSS / SVG / MathML） | 真正的 TeX 引擎编译，矢量图输出 |
| **产物形态** | HTML + CSS（+ 隐藏 MathML） | DOM 节点 / SVG | `.svg` 图片文件 |
| **渲染性能** | 快。同步渲染、无二次重排；官方基准比 MathJax 快数倍 | 慢一些。异步排版，页面会有一次"公式撑开"的抖动 | 无运行时开销（图片），但**首次编译慢**（秒级/公式） |
| **包体积** | `katex.min.js` ≈ 280KB（gzip ≈ 90KB）+ 字体 woff2 子集 ≈ 数百 KB | 按需加载，常见组合 ≈ 数百 KB ~ MB 级 | 服务端需要完整 TeX 发行版（**数 GB**） |
| **浏览器兼容** | 现代浏览器（IE 不支持） | 覆盖面更广，含老浏览器降级路径 | 与浏览器无关（纯图片） |
| **语法覆盖** | LaTeX 数学子集 + 常用 AMS 命令；**不支持宏包** | 覆盖更全，支持更多 AMS 宏包与扩展 | **100% LaTeX**，包括 tikz、pgfplots |
| **可访问性** | 输出隐藏 MathML（屏幕阅读器可读，但支持弱于 MathJax） | **最佳**：原生 MathML + 语音扩展 + 公式缩放菜单 | 靠 SVG 的 `<title>`/`<desc>`，较弱 |
| **静态站集成** | 极佳。可在**构建期**渲染，产物零 JS | 一般。通常客户端加载，或使用较重的 Node 端预渲染 | 差。构建环境必须装 TeX 发行版，CI 通常不可行 |
| **维护活跃度** | 活跃（Khan Academy，GitHub 持续更新） | 活跃 | 依赖 TeX 发行版 |

### 关于性能，说具体一点

KaTeX 的设计目标就是"快"：它牺牲了一部分语法覆盖，换来**同步、无重排**的渲染。单页几十个公式时，KaTeX 通常是毫秒级完成；MathJax 需要异步排版，页面会先显示再重排，肉眼可见抖动（FOUC）。

但对**个人博客**而言，更关键的差别其实是下面这条：

> **KaTeX 可以在构建期就把公式渲染完**，产出的 HTML 里公式已经是排好版的 DOM，读者端 **完全不需要加载任何 JS**。
> 这意味着：首屏没有公式闪烁、没有额外的网络请求、禁用 JS 也能正常看公式。

MathJax 虽然也有 Node 端方案，但配置复杂度和产物体积都要高得多。

---

## 三、KaTeX 的主要限制与应对

这是选型时最该看的部分。**逐条给可复制的替代写法。**

### 3.1 不支持 `\usepackage` 与任意宏包

KaTeX 没有宏包系统。想用自定义命令，走 `macros` 选项：

```js
katex.renderToString(src, {
  macros: {
    "\\R": "\\mathbb{R}",
    "\\d": "\\mathrm{d}",
    "\\bra": "\\langle #1 |",
  },
});
```

带参数的宏用 `#1`、`#2`。

### 3.2 `align` / `gather` 等无编号环境支持有限

KaTeX 支持 `aligned`、`gathered`、`split`、`cases`、`array`、`matrix` 系列，但**不带编号的 `align` 环境**支持不完整。

❌ 不推荐：

```latex
\begin{align}
a &= b \\
c &= d
\end{align}
```

✅ 改成嵌在 `$$ ... $$` 里的 `aligned`：

```latex
$$
\begin{aligned}
a &= b \\
c &= d
\end{aligned}
$$
```

### 3.3 不能自动编号，也没有 `\label` / `\ref` / `\eqref`

KaTeX 不知道整篇文章的公式计数。要编号就手工写 `\tag{}`：

```latex
$$
E = mc^2 \tag{1}
$$
```

交叉引用只能手写链接（在博客里通常也不需要）。

### 3.4 完全没有 tikz / pgfplots / chemfig

绘图类宏包一律不支持。应对：

- 在**本地**用 LaTeX 编译成 SVG，再当图片插入：

  ```bash
  pdflatex figure.tex
  pdf2svg figure.pdf figure.svg
  ```

- 或改用前端绘图库（Mermaid、ECharts、Plotly）

### 3.5 `\newcommand` 只能在构建期预置

运行时在文档里写 `\newcommand{\foo}{...}` 支持有限，别依赖它。统一走 3.1 的 `macros`。

### 3.6 部分冷门 AMS 环境与 Unicode 符号缺失

对策：查官方支持表 <https://katex.org/docs/supported.html>，缺失的换等价写法，或转 SVG 图片。

### 3.7 与 Markdown 的语法冲突（这是最容易踩的坑）

`$a_1$` 里的下划线会被 Markdown 解析器当成斜体标记吞掉，渲染成 `a<em>1</em>`。

**Markdown 解析发生在公式解析之前**，所以必须在 Markdown 层解决，而不是在 KaTeX 层。本项目的做法是：把行内数学规则注册在 markdown-it 的 `escape` / `emphasis` 规则**之前**，让 `$...$` 在斜体解析前就被整体吃掉并输出成 HTML。

```js
md.inline.ruler.before('escape', 'math_inline', mathInline);
```

同时规避美元价格误判（`$5 和 $100` 不应被当成公式）。

### 3.8 字体必须与 CSS 同层部署

`katex.min.css` 里字体路径是相对的 `fonts/`。如果 CSS 和 `fonts/` 目录不同层，所有符号都会显示成方块（tofu）。

正确结构：

```
assets/css/katex.min.css
assets/css/fonts/KaTeX_Main-Regular.woff2
assets/css/fonts/…
```

### 3.9 出错会中断渲染

务必设置 `throwOnError: false` 并包 try/catch，让出错的公式降级成红字源码而不是炸掉整页构建。

```js
katex.renderToString(src, { throwOnError: false, errorColor: '#cc0000' });
```

---

## 四、决策结论

### 4.1 判定树

```
需要画 tikz / pgfplots 图，或要论文级排版？
  ├── 是 → 服务端 LaTeX → SVG（图片插入）
  └── 否 ↓

需要屏幕阅读器友好（MathML + 语音）、或必须用 \eqref 自动编号、
或用到 KaTeX 不支持的宏包？
  ├── 是 → MathJax v3
  └── 否 ↓

追求首屏快、公式量中等偏大、静态站可预渲染？
  └── 是 → KaTeX（构建期预渲染）  ← 本项目
```

### 4.2 三条路线的适用边界

| 方案 | 适用场景 | 不适用场景 |
|---|---|---|
| **KaTeX** | 博客 / 文档 / 教学站点；公式语法在常用 AMS 子集内；希望首屏快、零运行时 JS | 需要 tikz 绘图；需要自动编号与交叉引用；强无障碍要求 |
| **MathJax v3** | 无障碍是硬需求；公式语法复杂、用到冷门宏包；公式数量少、能容忍异步重排 | 极端追求首屏性能；公式极多（上百个/页） |
| **服务端 LaTeX→SVG** | 需要 tikz/pgfplots；要求无 JS 也能显示（KaTeX 预渲染其实也满足）；已有 TeX 工具链 | CI 环境装不了 TeX（GitHub Actions 免费额度下很吃力）；需要公式可被选中复制 |

### 4.3 本项目结论

**KaTeX + 构建期预渲染。** 理由：

1. 五篇示例文章的公式全部落在常用 AMS 子集内（$\varepsilon$-$\delta$、泰勒展开、特征值方程、欧拉-拉格朗日方程、定态薛定谔方程、麦克斯韦方程组），KaTeX 完全覆盖。
2. 静态站可以在构建期渲染，读者端零 JS——这对一个"注重长文阅读体验"的站点是最优解。
3. 依赖精简（只加 `katex` 一个包），CI 上 `npm ci` 秒级完成。
4. 若将来某篇文章需要 tikz 图，按 3.4 的办法单独编译成 SVG 插入即可，不需要改技术栈。

**保留的退路**：`src/lib/md-math.js` 是唯一的公式接入点，且同时兼容 Node 与浏览器（后台预览复用同一份）。将来要换成 MathJax，改动集中在这一点，不需要碰模板和生成器。
