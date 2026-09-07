# 云梦的数理小屋 · GitHub 操作手册

> 适用项目：`G:\buddywork\9.7云梦数理小屋`（静态博客生成器）
> 仓库：`https://github.com/ClouderDream/math-hut`（Public）
> 线上站点：`https://clouderdream.github.io/math-hut/`
> 当前版本：**v1.0**（已打 tag 并推送）

---

## 一、整体结构

| 项 | 说明 |
|---|---|
| 源码 | 本地 `G:\buddywork\9.7云梦数理小屋`，零框架 Node 静态生成器（EJS 模板 + KaTeX 预渲染） |
| 仓库 | `ClouderDream/math-hut`，Public，**免费** |
| 部署 | GitHub Actions 自动构建（Node 22）→ 部署到 GitHub Pages |
| 工作流 | `.github/workflows/deploy.yml`（`push` 到 `main` 或手动 `workflow_dispatch` 触发） |
| Pages 源 | **GitHub Actions**（`build_type: workflow`，不是"从分支部署"） |
| 域名 | `https://clouderdream.github.io/math-hut/`（可后续绑自定义域名，需自费买域名） |

---

## 二、日常更新（改完内容发布）

```bash
cd G:/buddywork/9.7云梦数理小屋
# 1) 本地改文件（文章放 src/posts/，图片放 src/assets/img/）
# 2) 可选：本地先看效果
npm run build && npm run preview
# 3) 提交并推送
git add -A
git commit -m "更新说明"
git push
```

推送后 Actions 自动 **构建 → 部署**，通常 1–2 分钟上线。站点网址不变。
凭据已由 Git Credential Manager 存入本机，**`git push` 无需再输入账号密码**。

---

## 三、凭据与安全（重要）

- **本仓库 git 身份**：`ClouderDream <ClouderDream@users.noreply.github.com>`（匿名，仅本仓库生效，未改动你的全局配置）。
- **推送凭据**：经典 PAT（`ghp_` 开头），作用域 `repo`（含 Contents API 与 push）。
- **存储位置**：Windows 凭据管理器（经 Git Credential Manager）。换机/泄露后需重新登录。
- **绝对不要**把明文 token 写进代码、commit、Issue、网页或任何日志。
- **泄露/换机处理**：GitHub → Settings → Developer settings → Personal access tokens → 撤销旧 token → 新建 → 本机执行 `printf 'protocol=https\nhost=github.com\nusername=ClouderDream\npassword=<新token>\n' | git credential approve`。

> 本机已做隐私隔离：仓库内不含手机号 / 学号 / 身份证 / 真实姓名；全局 git 的真实 QQ 邮箱未被写入本仓库。

---

## 四、手动触发 / 重新部署

- **不推送也部署**：仓库 → Actions → 选 `Build & Deploy Pages` → `Run workflow`。
- **API 触发**（需 PAT）：
  ```bash
  curl -X POST -H "Authorization: Bearer <PAT>" -H "Accept: application/vnd.github+json" \
    -d '{"ref":"main"}' \
    https://api.github.com/repos/ClouderDream/math-hut/actions/workflows/deploy.yml/dispatches
  ```

---

## 五、查看状态与排错

| 现象 | 排查 |
|---|---|
| Actions run 失败 | 进该 run 看 `build`/`deploy` 日志；最常见是 `npm ci` 网络抖动 → 点 `Re-run jobs` 重试 |
| 站点 404 | 首次部署较慢（等 1–2 分钟）；确认 `main` 已有内容、`deploy.yml` 未被改坏 |
| 部署后内容没更新 | 强刷浏览器；确认 push 成功且最新 run 为 `success` |
| `git push` 弹窗/失败 | 凭据助手应为 `manager`（GCM）；`git config --global credential.helper` 检查；必要时重走 GCM 登录 |

Pages 设置确认路径：仓库 → Settings → Pages → Source 应显示 **GitHub Actions**。

---

## 六、版本与标签

```bash
git tag -a v1.1 -m "v1.1: 说明"
git push origin v1.1
```

- `v1.0` 已打 tag 并推送（对应首个稳定版）。
- 打 tag **不会**自动重新部署；如需同步线上，再推送一次 `main` 或手动触发 workflow。

---

## 七、费用（确认免费）

- 公开仓库 + GitHub Pages + 公开仓库 Actions（标准 runner）＝ **全部免费**。
- 不会触发任何账单。唯一注意：**不要把仓库改成 Private**（私有 Pages 需 Pro/企业版付费）。
- 自定义域名免费托管，但域名本身需向注册商自费购买。

---

## 八、在线后台（管理面板）

- 后台通过 GitHub Contents API 读写仓库文件，需要 PAT。
- 把 PAT 填入后台配置（浏览器 `localStorage` 或本地配置文件），**不要提交到仓库**。
- 后台仅在你本地浏览器内使用，token 不会自动上传到任何服务器。

---

## 九、常用命令速查

```bash
git status                 # 看改动
git add -A && git commit  # 提交
git push                  # 推 + 自动部署
git tag -a v1.x -m "..."  # 打版本
git push origin v1.x      # 推 tag
git ls-remote --tags origin   # 看远端 tag
```
