# Local OCR 脚本职责

- `bootstrap.ps1` / `bootstrap.cmd`：把仓库拉取到指定目录，并调用安装流程。
- `install.ps1` / `install.cmd`：创建 `.venv`、安装依赖、做语法与关键模块校验。
- `start.ps1` / `start.cmd`：可选自动更新仓库，启动 `127.0.0.1:8765`，并可打开网站后台。
- `stop.ps1` / `stop.cmd`：只停止监听 127.0.0.1:8765 的 Python 服务，不误杀其它进程。
- `update.ps1`：在工作区干净时 fast-forward 更新 `main`；可选同步 Python 依赖。
- `doctor.ps1` / `doctor.cmd`：检查 Git、Python、关键包、源码语法与本地健康状态。

本地运行环境、模型缓存、日志和配置覆盖文件均由 `.gitignore` 排除。
