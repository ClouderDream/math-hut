# Local OCR 安全说明

## 默认安全边界

- HTTP 服务仅监听 `127.0.0.1`。
- 不接受公网或局域网直接访问。
- 不使用 Mathpix 或其它付费 OCR API。
- 图片/PDF 默认不上传第三方 OCR 服务。
- 模型权重和本地运行环境不提交 Git。

## 禁止事项

- 不把 `host` 改成 `0.0.0.0` 作为“解决连接问题”的手段。
- 不关闭浏览器安全策略来长期绕过 CORS/PNA。
- 不把 PAT、Cookie、密码、API Key 写入配置文件并提交。
- 不自动发布未经人工核对的数学 OCR 结果。

## 浏览器与 localhost

后台位于 GitHub Pages HTTPS 页面，本地服务是 loopback。若浏览器阻止访问，应先检查 CORS / Private Network Access / mixed-content 报错，再决定是否需要本地 HTTPS；不要扩大监听范围。
