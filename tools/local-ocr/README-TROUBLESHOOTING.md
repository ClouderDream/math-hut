# Local OCR 常见故障排查

## 后台显示“未连接”

1. 运行 `doctor.cmd`；
2. 确认 `http://127.0.0.1:8765/health` 能打开；
3. 确认没有把服务启动在其它端口；
4. 查看浏览器控制台是否有 CORS / Private Network Access / mixed-content 错误。

## Paddle 安装失败

优先确认 Python 版本为 3.10/3.11 x64；再按 PaddlePaddle 官方环境要求选择 CPU/GPU 安装方式。不要把全局 Python 包和 `.venv` 混用。

## CPU 识别时报 `ConvertPirAttribute2RuntimeAttribute` / oneDNN 错误

典型错误：

```text
NotImplementedError: (Unimplemented)
ConvertPirAttribute2RuntimeAttribute not support
[pir::ArrayAttribute<pir::DoubleAttribute>]
```

这是 PaddlePaddle 3.3.x CPU oneDNN/PIR 路径中的已知兼容性问题，不是图片、网络或后台接口导致的。

本项目当前固定：

```text
paddlepaddle==3.2.2
```

修复方式：

```powershell
cd tools\local-ocr
.\stop.ps1
.\.venv\Scripts\python.exe -m pip install --force-reinstall paddlepaddle==3.2.2
.\doctor.ps1
.\start.ps1
```

如果环境中依赖关系已经混乱，直接重建：

```powershell
.\stop.ps1
.\install.ps1 -Force
.\doctor.ps1
.\start.ps1
```

`doctor.ps1` 会明确检查 PaddlePaddle 是否为 3.2.2；CI 也会阻止未来把依赖约束重新放宽到当前有问题的 3.3.x。

## 第一次识别很慢

通常是模型首次下载与初始化。后续识别应明显更快。

## TikZ 结果不准确

当前只对线段和圆等简单几何做确定性检测。复杂手绘优先使用裁切 PNG/SVG，不要强行采用错误 TikZ。
