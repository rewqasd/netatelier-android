# 本地构建与复验

已用Node26.8.2、Homebrew OpenJDK21.0.12.1、Gradle8.14.3、AGP8.13.0、Kotlin2.3.21、SDK36/build-tools36.0.0构建。Gradle wrapper、npm锁文件及直接依赖版本已保存；不同JDK发行版不保证APK字节完全相同。

安装JDK21与Android command-line tools，将`JAVA_HOME`和`ANDROID_HOME`指向各自目录。Linux不会使用开发者Mac的路径。使用官方工具阅读并接受项目必需SDK许可后执行：

```sh
sdkmanager 'platforms;android-36' 'build-tools;36.0.0' 'platform-tools'
npm ci
bash scripts/android-env.sh check
npm run android:build
```

产物`android/app/build/outputs/apk/debug/app-debug.apk`使用本机debug签名，跨电脑可能不同，不应假装可以覆盖正式发布包。首次依赖下载需要网络；离线运行与离线构建是不同承诺。

## 验证

```sh
npx playwright install --with-deps chromium
node scripts/verify.mjs
ANDROID_SERIAL=emulator-5580 node scripts/verify.mjs --android
```

用专用模拟器实际序列号替换示例。原生instrumentation会安装/移除目标测试应用；不要对有重要项目的手机运行。失败即停，结果在`artifacts/verification/`，不自动推送或发布。

三图闭环使用原创图，并通过真实UI人工校正，不把人工结果冒称自动识别准确率：

```sh
node scripts/acceptance-fixtures.mjs
ANDROID_SERIAL=emulator-5580 node scripts/android-acceptance.mjs --fresh android/app/build/outputs/apk/debug/app-debug.apk
```

`--fresh`卸载专用模拟器里的本应用及私有测试数据，断网重装；要求没有Google Play Services的AOSP模拟器。输出在`artifacts/acceptance/`。安装Poppler以提供pdfinfo、pdftotext和pdftoppm。桌面替身不能代替本项设备验收。

## 本地签名验证包

私钥、密码文件和配置必须在仓库外，权限仅所有者可读写。请使用独立应用身份，勿复用其他应用私钥。配置JSON字段为`keystore`、`alias`、`storePasswordFile`、`keyPasswordFile`，文件路径须为绝对路径；配置不应包含明文密码。

```sh
# JAVA_HOME和ANDROID_HOME须已显式设置；先提交全部源代码
node scripts/release.mjs /absolute/private/signing.json
```

脚本检查工作区/历史安全性，构建非debuggable release变体、16KiB对齐、签名并核验包名/API/版本/权限；输出`artifacts/releases/`内APK、SHA256SUMS、证书摘要和包含源提交的release-manifest.json。不会自动推送GitHub，也不会把私钥复制进仓库。公开CI只构建明确标注的debug验证包。

签名后的同一APK需另跑不使用WebView调试桥的实际UI检查：

```sh
ANDROID_SERIAL=emulator-5580 node scripts/android-release-smoke.mjs signed.apk artifacts/acceptance/inputs/clear-plan.png
```

该命令会卸载专用模拟器里的本应用，断网重装并测试真实OCR/场景保存重启，同时检查ADB整屏像素中画布没有覆盖上方工具栏。图片解码使用本机Playwright Chromium，不连接或修改被测应用。不能用于有重要数据的手机。不要只验证debug包后声称release包也通过。

模拟器整屏画面必须另行检查，WebView调试截图不能替代。此Mac ARM64上的Emulator37.1.11搭配WebView133在`swiftshader`及`swangle`出现ANGLE着色器错误和重复画布条带；同一APK、数据改用`-gpu host`后正常。这里只调整验收设备的图形后端，没有在应用中关闭硬件加速，也不能外推到真实手机；其他主机按[Android官方图形配置说明](https://developer.android.com/studio/run/emulator-acceleration)选择兼容后端。

针对审查后的编辑修复，先 `npm run android:build`，在专用模拟器安装该debug APK，再运行 `ANDROID_SERIAL=emulator-5580 node scripts/android-edit-repairs.mjs`。它通过实际界面测试锁定路线、手工摄像头目标、保存重启和酒店主干重确认，仅读取原生存储用于断言，不直接改写工程来伪造成功。签名包另用上面的黑盒脚本，不使用WebView调试桥。
