# Codex 本机配置提示词模板

把下面提示词中的 `<TARGET_DIR>` 替换为你的指定目录后交给 Codex：

```text
你现在在一台 Windows 电脑上操作。请为 ClouderDream/math-hut 配置本地免费 OCR/TikZ 辅助服务。

目标目录：<TARGET_DIR>
GitHub 仓库：https://github.com/ClouderDream/math-hut.git

要求：
1. 只在目标目录及其子目录中创建/修改本项目文件；不要修改其他项目。
2. 如果目标目录没有仓库，克隆 ClouderDream/math-hut；如果已有该仓库，先检查 git status，存在未提交改动时不要覆盖，先报告并继续做不冲突的环境配置。
3. 使用仓库中的 tools/local-ocr 作为唯一实现来源，不另造一套重复服务。
4. 优先使用 Python 3.11 x64；允许 3.10，不要使用 3.12+，除非仓库 requirements 已明确支持。
5. 在 tools/local-ocr/.venv 建独立虚拟环境，安装 requirements.txt。不要全局污染 Python 环境。
6. 不使用 Mathpix、付费 OCR API、云 OCR API 或任何需要 API Key 的识别服务。
7. OCR 默认使用 PaddleOCR / PP-StructureV3；草图使用当前仓库 OpenCV + SVG/TikZ 回退链路。不要下载来源不明的模型。
8. 模型缓存留在本机，不提交 Git；确认 .venv、缓存、日志、模型没有进入 git status。
9. 服务必须只监听 127.0.0.1:8765，不要改成 0.0.0.0。
10. 运行 tools/local-ocr/doctor.ps1，解决可自动解决的问题。
11. 启动服务并验证 GET http://127.0.0.1:8765/health 返回 ok=true。
12. 用一张本地测试图片验证 POST /ocr；如果目标目录内没有合适图片，可新建一个很小的测试图，但不要向 GitHub 提交测试产物。
13. 验证 POST /sketch 可以返回 svg、tikz 和 crop_png_data_url。
14. 检查网站后台 https://clouderdream.github.io/math-hut/admin/ 与 localhost 服务的 CORS 连接；如果 Edge/Chrome 因 Private Network Access 或 mixed-content 阻止请求，先准确定位浏览器错误，不要放宽服务到局域网。优先保留 loopback-only 安全边界。
15. 不修改网站业务逻辑，除非为了让现有 OCR 页面与本机服务联调必须修改；若确需修改，先说明文件和原因，并保持改动最小。
16. 不提交密码、PAT、Cookie、API Key、个人路径秘密或模型权重。
17. 完成后给我一份简短报告：安装位置、Python 版本、关键包版本、健康检查结果、OCR 测试结果、草图测试结果、如何启动/停止/更新、仍存在的问题。

优先执行仓库已提供的脚本：
- tools/local-ocr/install.ps1
- tools/local-ocr/start.ps1
- tools/local-ocr/doctor.ps1
- tools/local-ocr/update.ps1
- tools/local-ocr/stop.ps1

如果脚本本身有 bug，可以在目标目录中修复，并明确列出修改内容；不要静默绕过。
```
