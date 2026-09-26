# 离线导出与核查

编辑器的“导出方案”只使用已应用的工程；未应用表单会阻止导出。

| 输出 | 范围与用途 |
| --- | --- |
| 当前楼层 SVG / PNG | 仅选择的楼层；包含实际工程锚点、引线、房间图例及独立线缆的共线路径 |
| 全项目拓扑 SVG / PNG | 与报价相同的实际设备、连接及端口分配，不另生成一套设备 |
| 全项目报价 CSV | 全楼层明细、精确到分的合计、人工改价/估算价标签及条件；UTF-8 BOM，防公式注入 |
| 全项目方案 PDF | 封面汇总、逐层图及点位表、逐页拓扑连接图、报价明细、价格出处与待确认事项 |
| 完整工程包 | `.netatelier` 备份，包括工程 JSON 和所引用的原图/规范化图片；可重新导入为独立项目 |

SVG/PNG/CSV/工程包通过安卓系统文件选择器选择位置。取消选择不改变工程内容；写入错误会说明目标可能留下不完整文件，不能把文件名出现当作已成功写完。

PDF 使用 Android 官方 `PrintManager` 和本地 WebView。点“全项目方案 PDF”后，选择 **保存为 PDF → A4 → 全部页面 → 保存位置**。不使用云转换、隐藏 API 或在线字体。系统打印 API 不把用户选定 URI/最终保存状态返回给应用，所以返回后仅提示自行核查，不显示未经证实的“已保存”。可在系统文件应用中分享 PDF；应用内另提供当前楼层 PNG 分享，发给谁由用户自己选择。

中文使用 Android 自带的 `sans-serif` 字族，离线可用。AOSP36 实际输出由 Skia 生成 Type3 字形并带 ToUnicode，中文可以抽取；这不等同于内嵌原始 OTF/TTF 字体。实体手机/厂商系统的字体和打印服务兼容性尚需用户验证。

原图导出时内嵌为本地 PNG/JPEG，禁止外部图片 URL；找不到原图时明确失败，不静默生成缺图报告。PNG 上限24MP/最长边16384px，超限建议改用 SVG；普通导出内容上限20MiB，PDF HTML 上限40MiB。复杂工程可能产生多页报告；不要只预览第一页。

开发浏览器可下载 SVG/PNG/CSV，但不会冒充安卓 PDF/备份保存成功。Android端验收脚本为 `scripts/android-export-smoke.mjs`，必须明确指定测试设备；实际保存后重新读取文件并检查金额、中文和酒店四层。完整视觉验收见发布前验收记录。

实现依据：[Android HTML 打印文档](https://developer.android.com/training/printing/html-docs)、[PrintDocumentAdapter](https://developer.android.com/reference/android/print/PrintDocumentAdapter)。
