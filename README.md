# 组网工坊 · NetAtelier

独立离线 Android 网络规划工具：导入本地平面图 → OCR及几何候选 → 人工校正 → 点位及布线 → 报价 → 拓扑 → 保存与导出。不依赖远程服务器或 Linux 旧项目，也不是“集优·智策”客户端。

## 功能与边界

- 五类可编辑模板：400㎡餐厅、300㎡办公室、1000㎡健身房、40客房四层酒店、200㎡零售。
- PNG/JPEG及逐页PDF；真实离线中文OCR、墙线候选和手工校正。不根据文件名套模板。
- 米坐标点位、半球监控、共线显示、独立线缆算量、全屏、撤销/重做和本机保存。
- 图纸、报价和拓扑使用同一工程；Wi-Fi5/6、型号、数量、监控和人工单价可以修改。
- POS、电脑、厨房打印机等未主动加入不收费；支持已有设备仅联网。
- 完整工程包备份和SVG/PNG/CSV/多页中文PDF。

**当前采用单价均为明确标注的预算估算，不是已核实的京东成交价。** 目录AP的299元是预算假设，不等于其引用页面价格。采购前请按型号核对当地到手价并改价。

简化覆盖、摄像机视域和路线不是现场实测。缺标尺、门洞、楼层主干或能力不足会提示待确认；不要直接用未确认方案施工。

## 安装与验证

最低Android8.0/API26；当前设备验证环境是ARM64 AOSP API36模拟器，不冒充实体手机测试。正式签名验证包仅以Release及哈希记录为准，CI debug包不是正式升级包。

见[安装和备份](docs/install.md)、[隐私](docs/privacy.md)、[导出](docs/exports.md)、[验收记录](docs/acceptance.md)。发布未完成的条目明确标为待完成。

## 本地构建

准备Node26.8.2、JDK21、Android SDK platform36/build-tools36.0.0。首次构建下载依赖需要网络，装好的应用运行不需要网络。

```sh
npm ci
npm test
npm run typecheck
npx playwright install chromium
npm run test:web
npm run android:build
```

产物 `android/app/build/outputs/apk/debug/app-debug.apk` 仅用于开发。Linux请显式设置`JAVA_HOME`、`ANDROID_HOME`。见[构建与复验](docs/build.md)。

```sh
node scripts/verify.mjs
# 仅专用模拟器；原生测试会安装/移除测试应用
ANDROID_SERIAL=emulator-5580 node scripts/verify.mjs --android
```

## 数据和许可

客户图纸、导出工程、设备日志、凭据和签名文件不进入Git。示例图均为原创合成素材，不是客户案例。

[第三方许可清单](docs/third-party-license-inventory.md)与原文随仓库及APK提供。公开源代码不代表已授予原创代码开源许可；目前未另指定原创代码许可证，第三方条款独立适用。
