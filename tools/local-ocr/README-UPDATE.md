# 更新方式

更新 GitHub 代码：

```powershell
.\update.ps1
```

同时同步 Python 依赖：

```powershell
.\update.ps1 -Dependencies
```

若仓库存在未提交改动，更新脚本会停止而不是覆盖本地修改。
