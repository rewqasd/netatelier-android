# 原创识别测试图

`clear-plan.svg` 是本项目原创合成测试图，不是客户图纸。文字及结构直接绘制，未调用规划算法。其栅格化 PNG 放在 Android instrumentation assets，用于真实模型读取中文“厨房”、数字“101”及英文“Office”。OCR 输入只含图片字节，不接收预设答案。

PDF 页面选择测试使用 Android PdfDocument 独立生成红、蓝页面及一条绿色边，核验实际像素与90°旋转位置，非模拟文件选择返回值。文件选择器的实际点击仍须在安卓端单独验收。
# Additional geometry fixtures

`tests/helpers/drawings.ts` produces original deterministic raster drawings: a two-room rectangle, a concave L-shaped outline, and angled triangular rooms with isolated noise. Pixel buffer generation is independent of the recognition algorithm. `editor.html` / `editor.tsx` host the real correction component with declared test OCR boxes; this is browser geometry/editing evidence only, never evidence of native OCR. These files are not imported by the application build entry.

## Full native acceptance inputs

`dimension-plan.svg` is an original four-room drawing with 26m/15m dimensions, Chinese/Latin text and smaller numeric annotations. `acceptance-fixtures.mjs` rasterizes it and creates a two-page PDF with a cover followed by the actual plan, to verify explicit page selection and retention of the original PDF.

`low-quality-plan.svg` is a different original L-shaped exhibition/changing-room plan. The generator adds blur, low JPEG quality and 90-degree rotation. The UI test explicitly rotates it back. It is not a transformed version of a built-in scenario.

`android-acceptance.mjs` records actual OCR text/boxes and geometry candidates before manually replacing/calibrating geometry through UI controls using the independently authored source coordinates. This verifies a real recognition/correction workflow, not a claim that automation alone reconstructed the final plan. It checks 459m2, 390m2 and156.48m2 with independent geometry expectations. Numeric vertex fields remove subpixel touch rounding before precise area assertions. No generated device coordinates are supplied as OCR answers.

PNG export destinations include an `export-` prefix so they cannot be confused with input images; exported PNG signature and1800px width are read from the file actually pulled back from Android. All generated inputs, exports, screenshots and logs are ignored under `artifacts/`.
