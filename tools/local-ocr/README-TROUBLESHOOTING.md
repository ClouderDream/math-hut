# Local OCR 常见故障排查

## 后台显示“未连接”

1. 运行 `doctor.cmd`；
2. 确认 `http://127.0.0.1:8765/health` 能打开；
3. 确认没有把服务启动在其它端口；
4. 查看浏览器控制台是否有 CORS / Private Network Access / mixed-content 错误。

## Paddle 安装失败

优先确认 Python 版本为 3.10/3.11 x64；再按 PaddlePaddle 官方环境要求选择 CPU/GPU 安装方式。不要把全局 Python 包和 `.venv` 混用。

## 第一次识别很慢

通常是模型首次下载与初始化。后续识别应明显更快。

## TikZ 结果不准确

当前只对线段和圆等简单几何做确定性检测。复杂手绘优先使用裁切 PNG/SVG，不要强行采用错误 TikZ。
