# Codex 执行最短路径

Codex 拿到指定目录后，优先：

```powershell
cd <TARGET_DIR>\tools\local-ocr
.\doctor.ps1
.\install.ps1
.\start.ps1 -NoBrowser
```

然后验证：

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

完整要求见 `CODEX_LOCAL_SETUP_PROMPT.md`。
