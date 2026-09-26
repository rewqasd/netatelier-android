# 构建环境记录

这是可重复构建的依赖记录，不代表产品功能已经验收。实际验收状态另见完成后的验收报告。

2026-09-26基础验证：`npm run android:build`退出0，APK包名正确、minSdk26，apksigner验证通过；在无Google Play服务的AOSP36 ARM64模拟器上，Wi-Fi与移动数据均关闭，首次安装与冷启动成功。截图已人工查看，中文基础页完整、无崩溃日志。这只是调试签名的基础壳，不代表OCR/规划/报价/导出已完成，更不是发布包。

## 已锁定版本

| 组件 | 版本 |
| --- | --- |
| Node.js（本次主机） | 26.8.2 |
| React / React DOM | 19.3.0 |
| Capacitor Core / Android / CLI | 8.5.2 |
| TypeScript | 7.0.2 |
| Vite / React插件 | 8.3.1 / 6.1.1 |
| Vitest / Playwright | 5.0.2 / 1.63.0 |
| Zod | 4.6.5 |
| JDK | OpenJDK21.0.12.1 |
| Android Gradle Plugin / Gradle | 8.13.0 / 8.14.3 |
| Kotlin / ExifInterface | 2.3.21 / 1.4.2 |
| MLKit Latin / Chinese bundled OCR | 16.0.1 / 16.0.1 |
| Android compile / target / minimum API | 36 / 36 / 26 |
| Build Tools / commandline tools | 36.0.0 / 22.0（下载包15859902） |
| 模拟器 / AOSP ARM64系统 | 37.1.11 / Android36 revision2 |
| platform-tools | 37.0.1 |

`package-lock.json` 固定 npm 依赖。脚本接受Node22.12+（22系列）、24系列或26+，须满足工具声明的版本范围；完整构建当前只在记录的主机版本验证。Gradle wrapper使用官方二进制ZIP并固定SHA-256，不把下载重试作为改变依赖版本的理由。

CLI的开发依赖xcode使用uuid的v4接口，覆盖为uuid11.1.1以消除旧版本安全公告；已检查并实际调用此接口。它不进入安卓运行时。可选macOS文件观察器fsevents的安装脚本未额外授权，不影响测试和生产打包。

## 本机构建

1. 安装JDK21与Android SDK，设置`JAVA_HOME`、`ANDROID_HOME`。不要把个人机器的绝对路径提交进仓库。
2. 仅安装所需SDK组件：`platforms;android-36`、`build-tools;36.0.0`、`platform-tools`；设备测试另需模拟器与AOSP ARM64系统镜像。
3. 首次安装SDK按官方提示审阅并接受所需`android-sdk-license`。不批量接受不相关许可；不启用遥测、不涉及商店协议。该许可是构建工具许可，不是本项目源码授权。
4. 执行`npm ci`、`npm test`、`npm run typecheck`、`npm run android:build`。
5. 构建脚本仅使用本进程环境，不修改shell配置、不替换系统Java。调试APK位于`android/app/build/outputs/apk/debug/app-debug.apk`；这不是正式签名发布包。

模拟器使用AOSP而非Google Play镜像，并显式设置`-no-metrics`。Android SDK工具下载需要联网；交付应用运行时与首次识别不得依赖网络。

场景预览阶段暂复用了主机现有Chromium1234，仅作几何图片检查；正式Playwright交互验收须使用当前锁定版本对应的浏览器，不混称同一验证环境。

参考：[Capacitor环境要求](https://capacitorjs.com/docs/getting-started/environment-setup)、[Android插件](https://capacitorjs.com/docs/plugins/android)。依赖的实际可构建性以本次构建及安装结果为准。
