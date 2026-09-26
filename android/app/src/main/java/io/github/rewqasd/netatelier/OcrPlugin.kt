package io.github.rewqasd.netatelier

import android.graphics.BitmapFactory
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "OfflineOcr")
class OcrPlugin : AsyncRequestPlugin() {
    @PluginMethod fun recognizeText(call: PluginCall) {
        val (id, token) = begin(call) ?: return
        execute(call, id, token) {
            val assetId = requireNotNull(call.getString("assetId")) { "缺少页面图片" }
            val file = DocumentService(context).assetFile(assetId)
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, bounds)
            DocumentLimits.validateImage(bounds.outWidth, bounds.outHeight)
            require(maxOf(bounds.outWidth, bounds.outHeight) <= DocumentLimits.MAX_EDGE) { "请先生成缩放后的页面" }
            val bitmap = requireNotNull(BitmapFactory.decodeFile(file.absolutePath)) { "页面图片无法读取" }
            try {
                OfflineTextRecognizer().use { recognizer ->
                    val rows = JSArray()
                    for (word in recognizer.recognize(bitmap, token)) rows.put(JSObject().put("text", word.text).put("source", "ocr")
                        .put("boxPx", JSObject().put("x", word.x).put("y", word.y).put("width", word.width).put("height", word.height)))
                    JSObject().put("text", rows)
                }
            } finally { bitmap.recycle() }
        }
    }
    @PluginMethod fun cancel(call: PluginCall) {
        call.getString("requestId")?.let { gate.cancel(it) }
        call.resolve()
    }
}
