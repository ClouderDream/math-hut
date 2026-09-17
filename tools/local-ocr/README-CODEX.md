# Codex 本机执行说明

本目录已经包含本地 OCR 所需的服务代码和 Windows 脚本。Codex 在本机配置时应优先执行现有脚本，而不是重新设计架构。

推荐顺序：

```powershell
cd <TARGET_DIR>\tools\local-ocr
.\doctor.ps1
.\install.ps1
.\start.ps1 -NoBrowser
```

服务启动后验证：

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

完整验收见 `LOCAL_SETUP_CHECKLIST.md`。

## 允许 Codex 修改的本机内容

- `tools/local-ocr/.venv/`
- 本机模型缓存
- `tools/local-ocr/config.local.*`
- 本机日志与测试输出
- 为修复实际 Windows 环境兼容问题而对 `tools/local-ocr/*.ps1`、`server.py` 做的必要小改动

## 不允许

- 不改监听地址为 `0.0.0.0`
- 不写入付费 OCR 服务或 API Key
- 不把模型权重、`.venv`、测试图片提交到仓库
- 不修改 `v1.3` 网站业务逻辑，除非 localhost 联调确实要求，并且先说明原因
