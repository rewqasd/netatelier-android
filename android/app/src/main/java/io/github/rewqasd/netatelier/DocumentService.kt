package io.github.rewqasd.netatelier

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.io.InputStream
import java.util.UUID
import java.util.concurrent.CancellationException
import java.util.concurrent.atomic.AtomicBoolean

class WorkToken {
    private val cancelled = AtomicBoolean(false)
    fun cancel() { cancelled.set(true) }
    fun check() { if (cancelled.get() || Thread.currentThread().isInterrupted) throw CancellationException("已取消") }
}
data class DocumentHandle(val id: String, val mime: String, val pages: Int)
data class RenderedPage(val bitmap: Bitmap, val documentId: String, val page: Int, val rotation: Int)
class DocumentService(private val context: Context) {
    private val directory = File(context.filesDir, "documents").apply { mkdirs() }
    private val safeId = Regex("[A-Za-z0-9][A-Za-z0-9_.-]{0,119}")

    /** Own and close the input. Only a fully validated document receives a final ID. */
    fun importDocument(input: InputStream, token: WorkToken): DocumentHandle = input.use { source ->
        token.check()
        val base = "document-${UUID.randomUUID()}"
        val temporary = File(directory, "$base.part")
        try {
            temporary.outputStream().use { output ->
                val buffer = ByteArray(32 * 1024)
                var count = 0L
                while (true) {
                    token.check()
                    val size = source.read(buffer)
                    token.check()
                    if (size < 0) break
                    if (size == 0) continue
                    count += size
                    DocumentLimits.validateBytes(count)
                    output.write(buffer, 0, size)
                }
                DocumentLimits.validateBytes(count)
                output.fd.sync()
            }
            val mime = detectMime(temporary)
            val pages = inspect(temporary, mime)
            token.check()
            val extension = when (mime) { "application/pdf" -> "pdf"; "image/jpeg" -> "jpg"; else -> "png" }
            val destination = File(directory, "$base.$extension")
            check(temporary.renameTo(destination)) { "无法保存导入文件" }
            try { token.check() } catch (e: Exception) { destination.delete(); throw e }
            DocumentHandle(destination.name, mime, pages)
        } finally { temporary.delete() }
    }

    fun assetFile(id: String): File {
        require(safeId.matches(id)) { "无效文件标识" }
        val file = File(directory, id)
        require(file.canonicalFile.parentFile == directory.canonicalFile && file.isFile && !file.name.endsWith(".part")) { "文件不存在" }
        return file
    }

    private fun detectMime(file: File): String {
        val header = ByteArray(8)
        val read = file.inputStream().use { it.read(header) }
        require(read >= 5) { "文件损坏或格式不支持" }
        if (header.copyOfRange(0, 5).contentEquals("%PDF-".toByteArray(Charsets.US_ASCII))) return "application/pdf"
        if (read == 8 && header.contentEquals(byteArrayOf(-119, 80, 78, 71, 13, 10, 26, 10))) return "image/png"
        if (header[0] == (-1).toByte() && header[1] == (-40).toByte() && header[2] == (-1).toByte()) return "image/jpeg"
        throw IllegalArgumentException("仅支持PNG、JPEG或PDF文件")
    }

    private fun <T> withPdf(file: File, block: (PdfRenderer) -> T): T {
        val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        try {
            val renderer = try { PdfRenderer(descriptor) } catch (e: Exception) { throw IllegalArgumentException("PDF损坏、加密或无法读取", e) }
            try { DocumentLimits.validatePages(renderer.pageCount); return block(renderer) }
            finally { renderer.close() }
        } finally { descriptor.close() }
    }

    private fun inspect(file: File, mime: String): Int {
        if (mime == "application/pdf") return withPdf(file) { it.pageCount }
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.absolutePath, bounds)
        DocumentLimits.validateImage(bounds.outWidth, bounds.outHeight)
        return 1
    }

    fun renderPage(id: String, page: Int, rotation: Int, token: WorkToken): RenderedPage {
        token.check()
        require(rotation in listOf(0, 90, 180, 270)) { "旋转角度必须为90度的整数倍" }
        val file = assetFile(id)
        val mime = detectMime(file)
        var bitmap: Bitmap = if (mime == "application/pdf") {
            withPdf(file) { renderer ->
                require(page in 0 until renderer.pageCount) { "PDF页码超出范围" }
                val pdfPage = renderer.openPage(page)
                try {
                    require(pdfPage.width > 0 && pdfPage.height > 0) { "PDF页面尺寸无效" }
                    val scale = minOf(2.0, DocumentLimits.MAX_EDGE.toDouble() / maxOf(pdfPage.width, pdfPage.height))
                    val width = maxOf(1, kotlin.math.round(pdfPage.width * scale).toInt())
                    val height = maxOf(1, kotlin.math.round(pdfPage.height * scale).toInt())
                    val raster = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                    try {
                        raster.eraseColor(Color.WHITE)
                        token.check()
                        pdfPage.render(raster, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                        token.check()
                        raster
                    } catch (e: Exception) { raster.recycle(); throw e }
                } finally { pdfPage.close() }
            }
        } else {
            require(page == 0) { "图片只有一页" }
            inspect(file, mime)
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, bounds)
            var sample = 1
            while (maxOf(bounds.outWidth, bounds.outHeight) / sample > DocumentLimits.MAX_EDGE) sample *= 2
            val options = BitmapFactory.Options().apply { inSampleSize = sample; inPreferredConfig = Bitmap.Config.ARGB_8888 }
            requireNotNull(BitmapFactory.decodeFile(file.absolutePath, options)) { "图片无法解码" }
        }
        try {
            token.check()
            val matrix = Matrix()
            if (mime != "application/pdf") {
                val exif = ExifInterface(file)
                // EXIF can include mirrored as well as rotated images.
                if (exif.isFlipped) matrix.postScale(-1f, 1f)
                matrix.postRotate(exif.rotationDegrees.toFloat())
            }
            matrix.postRotate(rotation.toFloat())
            if (!matrix.isIdentity) {
                val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                if (rotated !== bitmap) { bitmap.recycle(); bitmap = rotated }
            }
            token.check()
            return RenderedPage(bitmap, id, page, rotation)
        } catch (e: Exception) { bitmap.recycle(); throw e }
    }

    fun listDocumentIds(): List<String> = directory.listFiles().orEmpty().filter { it.isFile && it.name.startsWith("document-") && !it.name.endsWith(".part") }.map { it.name }.sorted()
    fun saveRaster(bitmap: Bitmap, token: WorkToken): String {
        token.check()
        require(maxOf(bitmap.width, bitmap.height) <= DocumentLimits.MAX_EDGE) { "页面图片超过识别尺寸限制" }
        val id = "raster-${UUID.randomUUID()}.png"
        val temporary = File(directory, "$id.part")
        val destination = File(directory, id)
        try {
            temporary.outputStream().use { output ->
                check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) { "页面图片保存失败" }
                output.fd.sync()
            }
            token.check()
            check(temporary.renameTo(destination)) { "页面图片保存失败" }
            try { token.check() } catch (e: Exception) { destination.delete(); throw e }
            return id
        } finally { temporary.delete() }
    }
}
