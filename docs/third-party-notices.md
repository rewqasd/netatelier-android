# Third-party dependency notices

完整依赖版本、出处及原文声明见 [运行时许可证清单](third-party-license-inventory.md) 和 [文件校验索引](licenses/index.json)。首页“隐私与第三方声明”随包展示原文并按 SHA-256 校验，长文分段读取；最终 APK 的离线读取以验收记录为准。

This document does not assign a license to the application's original source.

## Native recognition dependencies

- Google ML Kit Text Recognition and Chinese Text Recognition, version 16.0.1, are bundled Android SDKs and models. Their Maven POMs specify the [ML Kit terms](https://developers.google.com/ml-kit/terms). They are not represented as application-owned or Apache-licensed models. Preserve Google's SDK terms and review their data-disclosure information before redistribution.
- AndroidX ExifInterface 1.4.2 uses the Apache License 2.0. AndroidX source and license: https://android.googlesource.com/platform/frameworks/support/ .
- Kotlin standard library 2.3.21 uses the Apache License 2.0. Source and license: https://github.com/JetBrains/kotlin .

The app has no INTERNET permission, does not use a downloadable-model variant, and has passed initial bundled OCR testing on an offline AOSP emulator without Google Play Services. This describes observed app behavior, not an assertion that all SDKs have no telemetry-related code. The complete runtime dependency and license inventory is part of the pre-release audit; publication has not occurred.
