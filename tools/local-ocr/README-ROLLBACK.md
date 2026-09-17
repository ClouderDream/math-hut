# 回滚策略

本地 OCR 工具源码由 Git 版本控制。若某次更新导致本机服务不可用：

1. 先运行 `git status`，确认本地修改；
2. 查看 `VERSION_HISTORY.md` 和对应回滚分支/提交；
3. 只回滚 `tools/local-ocr` 时，可从稳定提交恢复该目录；
4. `.venv` 和模型缓存不是 Git 内容，源码回滚后如依赖不一致，可运行 `install.ps1 -Force` 重建环境。
