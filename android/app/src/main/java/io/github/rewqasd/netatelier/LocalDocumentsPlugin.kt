package io.github.rewqasd.netatelier

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "LocalDocuments")
class LocalDocumentsPlugin : AsyncRequestPlugin() {
    private val service by lazy { DocumentService(context) }

    @PluginMethod fun pickDocument(call: PluginCall) {
        val request = begin(call) ?: return
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            type = "*/*"
            addCategory(Intent.CATEGORY_OPENABLE)
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/png", "image/jpeg", "application/pdf"))
            putExtra(Intent.EXTRA_LOCAL_ONLY, true)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        try { startActivityForResult(call, intent, "pickedDocument") }
        catch (e: Exception) { gate.finish(request.first); call.reject("无法打开系统文件选择器", "PICKER_UNAVAILABLE") }
    }

    @ActivityCallback private fun pickedDocument(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val id = call.getString("requestId") ?: return call.reject("文件选择任务已失效", "STALE_REQUEST")
        if (result.resultCode != Activity.RESULT_OK || result.data?.data == null) {
            gate.finish(id)
            call.resolve(JSObject().put("cancelled", true))
            return
        }
        val token = try { gate.token(id) } catch (e: Exception) { call.reject("文件选择任务已失效，请重新选择", "STALE_REQUEST"); return }
        val uri = result.data!!.data!!
        execute(call, id, token) {
            val input = requireNotNull(context.contentResolver.openInputStream(uri)) { "无法读取所选文件" }
            val document = service.importDocument(input, token)
            JSObject().put("cancelled", false).put("handle", JSObject().put("id", document.id).put("mime", document.mime).put("pages", document.pages))
        }
    }

    @PluginMethod fun renderPage(call: PluginCall) {
        val (requestId, token) = begin(call) ?: return
        execute(call, requestId, token) {
            val id = requireNotNull(call.getString("id")) { "缺少文件标识" }
            val page = call.getInt("page") ?: 0
            val rotation = call.getInt("rotation") ?: 0
            val rendered = service.renderPage(id, page, rotation, token)
            try {
                val assetId = service.saveRaster(rendered.bitmap, token)
                val document = JSObject().put("assetId", assetId).put("sourceAssetId", id).put("mime", "image/png")
                    .put("widthPx", rendered.bitmap.width).put("heightPx", rendered.bitmap.height).put("page", page).put("rotationDeg", rotation)
                JSObject().put("document", document).put("uri", Uri.fromFile(service.assetFile(assetId)).toString())
            } finally { rendered.bitmap.recycle() }
        }
    }

    @PluginMethod fun assetUri(call: PluginCall) {
        try {
            val assetId = requireNotNull(call.getString("assetId")) { "缺少文件标识" }
            call.resolve(JSObject().put("uri", Uri.fromFile(service.assetFile(assetId)).toString()))
        } catch (e: Exception) { call.reject("本地附件不存在或标识无效", "INVALID_ASSET") }
    }

    @PluginMethod fun cancel(call: PluginCall) {
        call.getString("requestId")?.let { gate.cancel(it) }
        call.resolve()
    }
}
