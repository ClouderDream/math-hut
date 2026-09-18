# 云梦的数理小屋

一个面向数学与物理的**纯静态博客**。Markdown 写作、公式用 KaTeX 渲染、产物是可以直接扔到任何静态托管上的一堆 HTML 文件。

- 文章列表 / 分页 / 标签 / 归档 / 关于 / 全站搜索
- 明暗主题切换（记住选择，不闪屏）
- 代码高亮（带语言标签与行号、一键复制）
- LaTeX 行内与行间公式（**构建期预渲染，读者端零 JS**）
- 内置在线后台：浏览器里写文章，保存即提交到 GitHub，自动重新部署

---

## 一、目录结构

```
9.7云梦数理小屋\
├─ site.config.js          ★ 全站唯一配置源（站名/作者/导航/社交/分页/后台/仓库）
├─ package.json
├─ content\                ★ 你写东西的地方
│  ├─ posts\*.md           文章（一篇一个文件）
│  └─ pages\about.md       关于页
├─ src\                    站点源码（一般不用改）
│  ├─ build.js             构建入口
│  ├─ lib\                 配置/URL/slug/front-matter/阅读时长/Markdown+KaTeX
│  ├─ generators\          各页面生成器（首页/文章/标签/归档/搜索索引/RSS/后台）
│  ├─ templates\           EJS 模板（layout + 各页面 + partials）
│  ├─ assets\              css / js / img
│  └─ admin\               后台的浏览器端脚本
├─ scripts\
│  ├─ dev.js               本地服务器 + 自动重建
│  ├─ new-post.js          新建文章脚手架
│  └─ hash-password.js     生成后台口令哈希
├─ .github\workflows\deploy.yml   GitHub Actions 自动部署
└─ dist\                   ★ 构建产物（上传这个目录的内容即可上线）
```

## 二、安装与启动

### 2.1 前置条件

需要 [Node.js](https://nodejs.org/) 18 以上。检查版本：

```bash
node -v
npm -v
```

### 2.2 安装依赖

```bash
cd "G:/buddywork/9.7云梦数理小屋"
npm install
```

> 国内网络慢可以这样（临时指定镜像，不用改全局配置）：
> ```bash
> npm install --registry=https://registry.npmmirror.com
> ```

### 2.3 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地预览（<http://localhost:5173/math-hut/>），改文件自动重建 |
| `npm run build` | 构建，产物在 `dist/` |
| `npm run preview` | 构建完起服务看效果（端口 4173），不监听文件 |
| `npm run new "文章标题"` | 新建一篇带模板的文章 |
| `npm run hash-password 你的口令` | 生成后台口令哈希 |

## 三、写文章

### 3.1 新建

```bash
npm run new "从极限到导数"
```

会在 `content/posts/` 下生成 `2026-09-07-从极限到导数.md`，开头是这样：

```markdown
---
title: "从极限到导数"
date: 2026-09-07
tags: ["待分类"]
summary: "一句话概括这篇文章讲了什么。"
slug: "从极限到导数"
draft: false
---
```

### 3.2 front-matter 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | ✅ | 标题 |
| `date` | ✅ | 发布日期，格式 `YYYY-MM-DD` |
| `tags` | ✅ | 标签数组，如 `["微积分", "数学分析"]` |
| `summary` | ⬜ | 摘要，不写会自动取正文前 110 字 |
| `slug` | ⬜ | URL 里的文章标识。**建议手写英文**，如 `limit-and-derivative` |
| `draft` | ⬜ | 设为 `true` 则不上线（也不进搜索、sitemap、RSS） |

**阅读时长不用写**，构建时按字数自动算：`中文字数 + 1.5×英文词数 + 12×代码行数`，再除以 350 字/分钟，最少 1 分钟。

### 3.3 公式怎么写

行内公式用一个 `$` 包起来：

```markdown
质能方程 $E = mc^2$ 是狭义相对论的核心结论。
```

行间公式用两个 `$$`，**要单独成行**：

```markdown
$$
\int_0^1 x^2 \, \d x = \frac{1}{3}
$$
```

配置里已经预置了几个简写宏，直接用即可：`\R`（实数集）、`\C`、`\N`、`\Z`、`\d`（微分 d）、`\bra{}`、`\ket{}`。想加自己的宏，改 `site.config.js` 的 `math.macros`。

常见坑：

| 症状 | 原因 | 解决 |
|---|---|---|
| `$a_1$` 显示成 a1 或斜体 | 下划线被 Markdown 当斜体标记 | 本项目已处理，正常写即可 |
| 公式没渲染，源码原样显示 | `$` 前后有空格，或跨行了 | `$` 紧贴内容；行内公式不跨行 |
| 写价格 `$5` 被当成公式 | 正常美元符号 | 写成 `\$5` |
| 公式显示为红字 | KaTeX 不认识该命令 | 构建日志会提示位置，换写法即可 |

### 3.4 代码块

用三个反引号，后面写语言名：

````markdown
```python
def f(x):
    return x ** 2
```
````

支持的语言标签：Python、JavaScript、TypeScript、Shell、JSON、C/C++、Java、MATLAB、Julia、LaTeX、HTML、CSS 等。

## 四、改站点配置

所有需要改的东西都在 `site.config.js` 一个文件里：

| 位置 | 改什么 |
|---|---|
| `site.title` / `subtitle` / `description` | 站名、副标题、简介 |
| `site.author` / `copyright` | 作者、版权 |
| `site.base` | 部署子路径。**项目站点填 `/math-hut/`；如果仓库名叫 `你的用户名.github.io`，填 `/`** |
| `site.postsPerPage` | 每页文章数 |
| `nav` | 导航菜单 |
| `social` | 邮箱、GitHub 等联系方式（现在是占位值，换成你自己的） |
| `admin.owner` / `repo` / `branch` | 后台要读写的 GitHub 仓库 |

## 五、部署到 GitHub Pages

### 5.1 建仓库并推送

```bash
cd "G:/buddywork/9.7云梦数理小屋"
git init
git add -A
git commit -m "初始化博客"
git branch -M main
git remote add origin https://github.com/ClouderDream/math-hut.git
git push -u origin main
```

> 如果提示要输入密码：现在 GitHub 不接受账号密码，需要去
> <https://github.com/settings/personal-access-tokens> 生成一个 Token，用它当密码。

### 5.2 打开 Pages

1. 打开 `https://github.com/ClouderDream/math-hut/settings/pages`
2. **Source** 选 **GitHub Actions**（不是 "Deploy from a branch"）
3. 保存

之后每次 `git push`，`.github/workflows/deploy.yml` 会自动构建并部署。第一次跑完会给你网址：

```
https://ClouderDream.github.io/math-hut/
```

### 5.3 部署相关注意事项

- `package-lock.json` **必须提交**，否则 CI 上 `npm ci` 会失败。
- 仓库里 `.nojekyll` 由构建自动生成，不要删。
- 改了不生效？等 1~3 分钟（Actions 构建 + Pages 部署 + CDN），再强制刷新（Ctrl+F5）。
- 想换成用户主页站（网址没有 `/math-hut/` 后缀）：把仓库名改成 `ClouderDream.github.io`，然后把 `site.config.js` 里的 `base` 改成 `'/'`，重新 push。

## 六、在线后台

### 6.1 设置口令

```bash
npm run hash-password 你的口令
```

把输出的 `passHash` 和 `passSalt` 两行填进 `site.config.js` 的 `admin` 配置，重新构建部署。

### 6.2 申请 GitHub Token

1. 打开 <https://github.com/settings/personal-access-tokens>
2. **Generate new token**（选 Fine-grained token）
3. Token name 随便填；**Expiration** 建议 90 天
4. **Repository access** 选 `Only select repositories` → 勾 `math-hut`
5. **Permissions** → Repository permissions → **Contents: Read and write**
6. 生成后复制 `github_pat_...` 那串

### 6.3 使用

访问 `https://ClouderDream.github.io/math-hut/admin/`，输入口令 + Token 进入。可以新建、编辑、删除文章，左侧列表，右侧编辑 + 实时预览。

保存后约 **1.5~3 分钟** 线上生效（Actions 要跑一遍完整构建）。

### 6.4 关于安全，必须说清楚

- GitHub Pages 是**纯静态托管，没有服务器和数据库**，所以后台只能靠浏览器直接调 GitHub API 写文件。
- 口令的哈希写在公开的 JS 里，**它只防误操作，不是安全措施**。真正的安全边界是那个 Token。
- Token 默认存在 `sessionStorage`（关标签页失效）。勾了"记住"才写 `localStorage`——**公用电脑别勾**。
- Token 泄露 = 别人能改你的仓库。发现泄露立刻到 <https://github.com/settings/personal-access-tokens> 点 **Revoke**。

## 七、技术选型说明

| 选择 | 理由 |
|---|---|
| 零框架 Node 生成器 | 依赖只有 5 个且全都只在构建时用；产物是最干净的静态 HTML；出问题好排查 |
| `markdown-it` | Markdown 解析，插件机制是接 KaTeX 和生成目录的基础 |
| `katex` | **构建期**把公式渲染成 HTML+CSS，读者端不用加载任何 JS，公式秒出 |
| `highlight.js` | 构建期高亮，比 shiki 少装约 80MB；配色自己写的 30 行 CSS 变量，跟随明暗主题 |
| `ejs` | 模板，`<%= %>` 自动转义 |
| `gray-matter` | 解析 front-matter |
| 搜索：自建索引 + bigram 分词 | 中文二元切分 + 词频打分，零额外依赖，几十篇文章完全够用 |

读者端实际只有约 6KB 自己写的 JS（主题切换、搜索、菜单、复制、进度条），没有框架、没有 KaTeX 运行时。

## 八、常见问题

| 问题 | 解决 |
|---|---|
| `npm install` 很慢 | `npm install --registry=https://registry.npmmirror.com` |
| 构建报公式错误 | 日志会打印位置和原因；公式会降级显示成红字原文，不影响构建 |
| 公式符号显示成方块 | KaTeX 字体没拷对，`katex.min.css` 必须和 `fonts/` 同层 |
| 分页只有一页 | 文章数不够，或 `site.postsPerPage` 太大 |
| 文章没出现 | 检查 `draft` 是不是 `true`，或 `date` 是不是写错了 |
| 删了文章线上还在 | 重新 `npm run build` 再 push；浏览器 Ctrl+F5 |
| 后台保存报 409 | 远端文件已变（比如你本地 git 推过），刷新列表重新载入再改 |
| 后台报 401 / 403 | Token 过期或权限不够，重新生成一个 |
