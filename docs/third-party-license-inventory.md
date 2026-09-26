# Third-party license inventory

Snapshot: 2026-09-26. Scope: NetAtelier 0.1.0 production dependencies in `package-lock.json` and Android `:app:releaseRuntimeClasspath`.

This document does not assign a license to NetAtelier's original source. Third-party licenses apply to their respective components. Google's SDK/model terms are separate from the open-source licenses of libraries included within those SDKs.

The [machine-readable inventory](licenses/index.json) records every component, Maven POM license declaration, copied notice path, original source, file size, and SHA-256 digest. All paths in that inventory are relative to `docs/licenses/`. The directory contains verbatim upstream material; it does not contain application source, SDK binaries, or model files.

## Scope and evidence

- All seven npm production packages were checked against the installed package versions and lockfile. Development tools and tests are excluded from this production inventory.
- The offline Gradle `:app:dependencies --configuration releaseRuntimeClasspath` resolution completed successfully. A separate read-only resolution query found 72 external Maven components: 68 with binary artifacts and four metadata-only components. The three local Gradle projects are `:app`, `:capacitor-android`, and `:capacitor-cordova-android-plugins`.
- Every resolved external AAR/JAR, including each AAR's nested `classes.jar`, was checked for license, notice, copyright, and `third_party_licenses` entries. Available entries were copied byte for byte. All 72 component POMs and Guava's parent POM are retained under [licenses/poms](licenses/poms/).
- Identical notice files are stored once, based on their complete SHA-256 digest. The inventory retains all originating artifacts. This is particularly relevant to the bundled Latin/Chinese recognizers, whose complete attribution text and JSON index are identical to those of `text-recognition-bundled-common:17.0.0`.
- The Cordova AAR has no license or NOTICE file. Its exact `rel/14.0.1` upstream tag supplies the supplemental [LICENSE](licenses/upstream/cordova-android-14.0.1/LICENSE) and [NOTICE](licenses/upstream/cordova-android-14.0.1/NOTICE). Sources: [Apache Cordova LICENSE](https://raw.githubusercontent.com/apache/cordova-android/rel/14.0.1/LICENSE) and [Apache Cordova NOTICE](https://raw.githubusercontent.com/apache/cordova-android/rel/14.0.1/NOTICE).

This is a dependency and attribution snapshot, not an assertion that every resolved class survives packaging or that every library named in an SDK's cumulative notices executes in this app.

## npm production dependencies

| Package | Resolved version | Declared license | Verbatim material |
| --- | --- | --- | --- |
| `@capacitor/android` | 8.5.2 | MIT | [LICENSE](licenses/npm/capacitor-android-8.5.2/LICENSE) |
| `@capacitor/core` | 8.5.2 | MIT | [LICENSE](licenses/npm/capacitor-core-8.5.2/LICENSE) |
| `react` | 19.3.0 | MIT | [LICENSE](licenses/npm/react-19.3.0/LICENSE) |
| `react-dom` | 19.3.0 | MIT | [LICENSE](licenses/npm/react-dom-19.3.0/LICENSE) |
| `scheduler` | 0.28.0 | MIT | [LICENSE](licenses/npm/scheduler-0.28.0/LICENSE) |
| `tslib` | 2.8.1 | 0BSD | [LICENSE](licenses/npm/tslib-2.8.1/LICENSE.txt), [copyright notice](licenses/npm/tslib-2.8.1/CopyrightNotice.txt) |
| `zod` | 4.6.5 | MIT | [LICENSE](licenses/npm/zod-4.6.5/LICENSE) |

`scheduler` is a production dependency of React DOM; `tslib` is a production dependency of Capacitor core. Capacitor Android's local Gradle project is covered by the npm package's MIT license. The generated Cordova plugin project introduces the resolved Cordova framework dependency shown below; it is not assigned a separate application-source license here.

## Android release dependency inventory

License labels below follow the published POM declarations, including the inherited `guava-parent:26.0-android` declaration for `listenablefuture:1.0`. The retained POMs preserve each license's original name and URL. The [Apache 2.0 text](licenses/upstream/cordova-android-14.0.1/LICENSE) is included, as are the individual notices embedded in available AndroidX artifacts.

| Maven coordinate | Declared license/terms | Resolution |
| --- | --- | --- |
| `androidx.activity:activity:1.11.0` | Apache-2.0 | AAR/JAR |
| `androidx.annotation:annotation-experimental:1.4.1` | Apache-2.0 | AAR/JAR |
| `androidx.annotation:annotation-jvm:1.8.1` | Apache-2.0 | AAR/JAR |
| `androidx.annotation:annotation:1.8.1` | Apache-2.0 | Metadata only |
| `androidx.appcompat:appcompat-resources:1.7.1` | Apache-2.0 | AAR/JAR |
| `androidx.appcompat:appcompat:1.7.1` | Apache-2.0 | AAR/JAR |
| `androidx.arch.core:core-common:2.2.0` | Apache-2.0 | AAR/JAR |
| `androidx.arch.core:core-runtime:2.2.0` | Apache-2.0 | AAR/JAR |
| `androidx.collection:collection-jvm:1.4.2` | Apache-2.0 | AAR/JAR |
| `androidx.collection:collection:1.4.2` | Apache-2.0 | Metadata only |
| `androidx.concurrent:concurrent-futures:1.1.0` | Apache-2.0 | AAR/JAR |
| `androidx.coordinatorlayout:coordinatorlayout:1.3.0` | Apache-2.0 | AAR/JAR |
| `androidx.core:core-ktx:1.17.0` | Apache-2.0 | AAR/JAR |
| `androidx.core:core-splashscreen:1.2.0` | Apache-2.0 | AAR/JAR |
| `androidx.core:core-viewtree:1.0.0` | Apache-2.0 | AAR/JAR |
| `androidx.core:core:1.17.0` | Apache-2.0 | AAR/JAR |
| `androidx.cursoradapter:cursoradapter:1.0.0` | Apache-2.0 | AAR/JAR |
| `androidx.customview:customview:1.0.0` | Apache-2.0 | AAR/JAR |
| `androidx.drawerlayout:drawerlayout:1.0.0` | Apache-2.0 | AAR/JAR |
| `androidx.emoji2:emoji2-views-helper:1.3.0` | Apache-2.0 | AAR/JAR |
| `androidx.emoji2:emoji2:1.3.0` | Apache-2.0 | AAR/JAR |
| `androidx.exifinterface:exifinterface:1.4.2` | Apache-2.0 | AAR/JAR |
| `androidx.fragment:fragment:1.8.9` | Apache-2.0 | AAR/JAR |
| `androidx.interpolator:interpolator:1.0.0` | Apache-2.0 | AAR/JAR |
| `androidx.lifecycle:lifecycle-common:2.6.2` | Apache-2.0 | AAR/JAR |
| `androidx.lifecycle:lifecycle-livedata-core:2.6.2` | Apache-2.0 | AAR/JAR |
| `androidx.lifecycle:lifecycle-livedata:2.6.2` | Apache-2.0 | AAR/JAR |
| `androidx.lifecycle:lifecycle-process:2.6.2` | Apache-2.0 | AAR/JAR |
| `androidx.lifecycle:lifecycle-runtime:2.6.2` | Apache-2.0 | AAR/JAR |
| `androidx.lifecycle:lifecycle-viewmodel-savedstate:2.6.2` | Apache-2.0 | AAR/JAR |
| `androidx.lifecycle:lifecycle-viewmodel:2.6.2` | Apache-2.0 | AAR/JAR |
| `androidx.loader:loader:1.0.0` | Apache-2.0 | AAR/JAR |
| `androidx.profileinstaller:profileinstaller:1.4.0` | Apache-2.0 | AAR/JAR |
| `androidx.resourceinspection:resourceinspection-annotation:1.0.1` | Apache-2.0 | AAR/JAR |
| `androidx.savedstate:savedstate:1.2.1` | Apache-2.0 | AAR/JAR |
| `androidx.startup:startup-runtime:1.1.1` | Apache-2.0 | AAR/JAR |
| `androidx.tracing:tracing:1.2.0` | Apache-2.0 | AAR/JAR |
| `androidx.vectordrawable:vectordrawable-animated:1.1.0` | Apache-2.0 | AAR/JAR |
| `androidx.vectordrawable:vectordrawable:1.1.0` | Apache-2.0 | AAR/JAR |
| `androidx.versionedparcelable:versionedparcelable:1.1.1` | Apache-2.0 | AAR/JAR |
| `androidx.viewpager:viewpager:1.0.0` | Apache-2.0 | AAR/JAR |
| `androidx.webkit:webkit:1.14.0` | Apache-2.0 | AAR/JAR |
| `com.google.android.datatransport:transport-api:2.2.1` | Apache-2.0 | AAR/JAR |
| `com.google.android.datatransport:transport-backend-cct:2.3.3` | Apache-2.0 | AAR/JAR |
| `com.google.android.datatransport:transport-runtime:2.2.6` | Apache-2.0 | AAR/JAR |
| `com.google.android.gms:play-services-base:18.5.0` | Android SDK license | AAR/JAR |
| `com.google.android.gms:play-services-basement:18.4.0` | Android SDK license | AAR/JAR |
| `com.google.android.gms:play-services-mlkit-text-recognition-chinese:16.0.1` | ML Kit terms | AAR/JAR |
| `com.google.android.gms:play-services-mlkit-text-recognition-common:19.1.0` | ML Kit terms | AAR/JAR |
| `com.google.android.gms:play-services-mlkit-text-recognition:19.0.1` | ML Kit terms | AAR/JAR |
| `com.google.android.gms:play-services-tasks:18.2.0` | Android SDK license | AAR/JAR |
| `com.google.android.odml:image:1.0.0-beta1` | Android SDK license | AAR/JAR |
| `com.google.firebase:firebase-annotations:16.0.0` | Apache-2.0 | AAR/JAR |
| `com.google.firebase:firebase-components:16.1.0` | Apache-2.0 | AAR/JAR |
| `com.google.firebase:firebase-encoders-json:17.1.0` | Apache-2.0 | AAR/JAR |
| `com.google.firebase:firebase-encoders:16.1.0` | Apache-2.0 | AAR/JAR |
| `com.google.guava:listenablefuture:1.0` | Apache-2.0 | AAR/JAR |
| `com.google.mlkit:common:18.11.0` | ML Kit terms | AAR/JAR |
| `com.google.mlkit:text-recognition-bundled-common:17.0.0` | ML Kit terms | AAR/JAR |
| `com.google.mlkit:text-recognition-chinese:16.0.1` | ML Kit terms | AAR/JAR |
| `com.google.mlkit:text-recognition:16.0.1` | ML Kit terms | AAR/JAR |
| `com.google.mlkit:vision-common:17.3.0` | ML Kit terms | AAR/JAR |
| `com.google.mlkit:vision-interfaces:16.3.0` | ML Kit terms | AAR/JAR |
| `javax.inject:javax.inject:1` | Apache-2.0 | AAR/JAR |
| `org.apache.cordova:framework:14.0.1` | Apache-2.0 | AAR/JAR |
| `org.jetbrains.kotlin:kotlin-stdlib:2.3.21` | Apache-2.0 | AAR/JAR |
| `org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1` | Apache-2.0 | AAR/JAR |
| `org.jetbrains.kotlinx:kotlinx-coroutines-bom:1.8.1` | Apache-2.0 | Metadata only |
| `org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.8.1` | Apache-2.0 | AAR/JAR |
| `org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1` | Apache-2.0 | Metadata only |
| `org.jetbrains:annotations:23.0.0` | Apache-2.0 | AAR/JAR |
| `org.jspecify:jspecify:1.0.0` | Apache-2.0 | AAR/JAR |

## Bundled OCR and Google notices

The direct bundled recognizers are `com.google.mlkit:text-recognition:16.0.1` (Latin) and `com.google.mlkit:text-recognition-chinese:16.0.1` (Chinese). Their POMs declare [ML Kit terms](https://developers.google.com/ml-kit/terms). The terms page, checked for this snapshot, states that its terms incorporate the Google APIs Terms of Service and treats machine-learning models as related software. The SDK/model distribution is not relabeled as Apache-2.0 merely because its internal dependencies include open-source code.

| Resolved SDK(s) | Verbatim attribution text | Paired upstream index |
| --- | --- | --- |
| Bundled Latin 16.0.1, Chinese 16.0.1, bundled-common 17.0.0 | [Full notices](licenses/android/com.google.mlkit--text-recognition-bundled-common--17.0.0/third_party_licenses.txt) | [JSON index](licenses/android/com.google.mlkit--text-recognition-bundled-common--17.0.0/third_party_licenses.json) |
| Play-services text recognition 19.0.1, Chinese 16.0.1, common 19.1.0 | [Full notices](licenses/android/com.google.android.gms--play-services-mlkit-text-recognition-chinese--16.0.1/third_party_licenses.txt) | [JSON index](licenses/android/com.google.android.gms--play-services-mlkit-text-recognition-chinese--16.0.1/third_party_licenses.json) |
| ML Kit common 18.11.0 | [Full notices](licenses/android/com.google.mlkit--common--18.11.0/third_party_licenses.txt) | [JSON index](licenses/android/com.google.mlkit--common--18.11.0/third_party_licenses.json) |
| ML Kit vision-common 17.3.0 | [Full notices](licenses/android/com.google.mlkit--vision-common--17.3.0/third_party_licenses.txt) | [JSON index](licenses/android/com.google.mlkit--vision-common--17.3.0/third_party_licenses.json) |
| ML Kit vision-interfaces 16.3.0 | [Full notices](licenses/android/com.google.mlkit--vision-interfaces--16.3.0/third_party_licenses.txt) | [JSON index](licenses/android/com.google.mlkit--vision-interfaces--16.3.0/third_party_licenses.json) |
| Play-services base 18.5.0, basement 18.4.0, tasks 18.2.0 | [Full notices](licenses/android/com.google.android.gms--play-services-base--18.5.0/third_party_licenses.txt) | [JSON index](licenses/android/com.google.android.gms--play-services-base--18.5.0/third_party_licenses.json) |
| ODML image 1.0.0-beta1 | [Full notices](licenses/android/com.google.android.odml--image--1.0.0-beta1/third_party_licenses.txt) | [JSON index](licenses/android/com.google.android.odml--image--1.0.0-beta1/third_party_licenses.json) |
| DataTransport runtime 2.2.6 | [Full notices](licenses/android/com.google.android.datatransport--transport-runtime--2.2.6/third_party_licenses.txt) | [JSON index](licenses/android/com.google.android.datatransport--transport-runtime--2.2.6/third_party_licenses.json) |

The DataTransport API/backend and Firebase components/JSON-encoder AARs have empty notice text and empty JSON objects; these are retained as supplied and do not replace their Apache-2.0 POM declarations. Components covered by Android SDK terms retain [the POM-specified terms URL](https://developer.android.com/studio/terms.html).

The full bundled OCR text includes upstream attributions for TensorFlow, TensorFlow Lite Support, TensorFlow Models, Eigen, ICU, OpenCV, protobuf, and many other internal components. Its JSON records names and byte ranges into the supplied text. Those names are cumulative vendor attribution data, not additional independently resolved Maven packages, and have not been used to infer SDK source availability or runtime behavior.

## Release delivery and verification boundary

The `docs/licenses/` directory and this inventory are ready to accompany a release as attribution material. A release must preserve the applicable license text, copyright notices, and NOTICE text in a form delivered to its recipients. MIT packages retain their full license/copyright text; Apache-2.0 components retain the Apache license and applicable attribution/NOTICE material; `tslib` retains its 0BSD text and supplied copyright notice. The individual upstream terms remain authoritative.

At this snapshot, this audit has not added a notices screen, copied these documents into APK assets, inspected a final signed release APK, or verified that standalone APK recipients can access the notices. Those packaging/delivery checks remain part of release preparation. This inventory also does not grant a license to original application source, record acceptance of Google terms, or replace a privacy disclosure review. Google's [ML Kit privacy information](https://developers.google.com/ml-kit/terms) distinguishes on-device image/text processing from SDK performance/utilization metrics; this license audit makes no telemetry or device-network claim.

If dependencies or bundled assets change, resolve the release classpath again and refresh this inventory before distributing a new build. A source-code release that includes development dependencies or additional bundled assets requires a corresponding scope review.
