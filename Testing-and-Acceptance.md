# 测试与验收

## Phase 1 上线检查

- [ ] 类型、静态检查与生产构建通过。
- [ ] 首页、文章、Projects、About、分类、标签与 Archives 可通过预期入口访问。
- [ ] 代表性 Markdown 文章的标题、代码和图片正常渲染，TOC 可跳到对应标题，灯箱可打开和关闭。
- [ ] 深浅色切换与 Command Palette 可用。检查键盘操作、焦点状态及窄屏布局。
- [ ] SEO 元信息和 RSS 条目、链接与生产 URL 一致。
- [ ] GitHub Pages 实际部署后，直接打开深层 URL 并验证样式、图片、导航及订阅链接。

## 开源发布检查

- [ ] 从 GitHub Template 新建站点，按 README 完成配置、写作、构建与部署。
- [ ] 验证代表性配置组合、Feature Flags 与示例内容。
- [ ] 检查 Lighthouse、无障碍、SEO 和依赖漏洞，记录结果。
- [ ] 检查 MIT 许可、CHANGELOG、Release 说明和适用的迁移指南。

## TBD

自动化工具及用例分布、浏览器和设备矩阵、性能与无障碍阈值。头脑风暴记录提出 Playwright 等候选方案，具体选型待确认。当前仅建立验收清单。
