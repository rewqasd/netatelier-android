# 本地导入与文字识别

本模块使用Android系统文件选择器，只复制用户选择的PNG/JPEG/PDF到应用私有存储；不读取整个相册，不修改原件。输入上限50MiB，图片上限2400万像素，PDF最多60页。PDF明确选页，识别栅格最长边不超过2400px；图片先检查尺寸再采样解码，处理EXIF旋转/镜像以及用户额外四分之一圈旋转。

原始文件与规范化栅格分别作为`sourceAssetId`和`assetId`保存。原生私有URI只用于当前界面读取，不写入可移植项目。文字坐标基于规范化栅格像素，不等于工程米坐标。

任务在后台执行；同一插件拒绝并发任务。取消会丢弃结果、清理未完成文件，不把半份结果应用到项目。模型读取图片期间保留像素资源，完成后关闭识别器并回收位图。进度仅显示当前实际步骤，不编造识别置信度或百分比。

## 模型与边界

- 随APK打包 `com.google.mlkit:text-recognition:16.0.1` 和 `text-recognition-chinese:16.0.1`，不用`play-services-mlkit-*`的首次下载模型路径。
- EXIF使用 `androidx.exifinterface:exifinterface:1.4.2`。
- 应用合并清单明确移除INTERNET及ACCESS_NETWORK_STATE；不添加账户、广告或分析服务。第三方MLKit自身的许可及数据处理说明仍适用，不能只凭“离线模型”推断其所有内部行为；本应用从权限层阻止联网。
- OCR只返回实际文字及框，不返回墙体或房间。原始识别结果必须经过后续几何识别和人工校正。
- 合成测试图实测识别出“厨房 101”“Office 202”“就餐区”，但“入口”中的“口”被识别成形似的“ロ”，并出现重复数字候选。保留原始结果供校正，不伪造满分识别率。

参考：[官方随包OCR配置](https://developers.google.com/ml-kit/vision/text-recognition/v2/android)、[ExifInterface版本说明](https://developer.android.com/jetpack/androidx/releases/exifinterface)。完整第三方许可清单随最终发布文档提供。

## 已验证层次

2026-09-26，AOSP Android36 ARM64模拟器，无Google Play服务，Wi-Fi与移动数据关闭：

- 真实原生测试覆盖中文/英文/数字OCR、PDF页码与90°旋转、JPEG EXIF、文件/像素/页数限制、损坏文件、复制取消、PNG栅格保存、并发拒绝与过期结果。
- 经系统文件选择器打开本项目原创测试PNG，原生复制→页面栅格→随包OCR→WebView文字列表和原图框选完整跑通。
- 这不是几何识别、全产品、实体手机或正式发布APK验收。后续仍需三种非模板图纸、完整校正和全产品回归。

`scripts/android-ui-smoke.mjs`要求明确指定`ANDROID_SERIAL`，使用Playwright的Android WebView接口。普通桌面CDP连接不支持该WebView的浏览器上下文管理，不以更换成桌面浏览器绕过原生验证。
