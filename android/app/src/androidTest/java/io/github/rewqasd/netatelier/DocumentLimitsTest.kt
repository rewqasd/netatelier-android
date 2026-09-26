package io.github.rewqasd.netatelier

import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.io.File
import android.graphics.Bitmap
import android.graphics.Canvas
import androidx.exifinterface.media.ExifInterface
import java.util.concurrent.CancellationException
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DocumentLimitsTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    @Test fun rejectsOversizedInputBeforeBitmapAllocation() {
        assertThrows(IllegalArgumentException::class.java) { DocumentLimits.validateBytes(50L * 1024 * 1024 + 1) }
        assertThrows(IllegalArgumentException::class.java) { DocumentLimits.validateImage(6001, 4000) }
        assertThrows(IllegalArgumentException::class.java) { DocumentLimits.validateImage(0, 100) }
        assertThrows(IllegalArgumentException::class.java) { DocumentLimits.validatePages(61) }
        DocumentLimits.validateImage(6000, 4000)
        DocumentLimits.validateBytes(50L * 1024 * 1024)
        val size = DocumentLimits.rasterSize(6000, 4000)
        assertEquals(Pair(2400, 1600), size)
    }

    @Test fun selectedPdfPageAndRotationProduceDifferentRealPixels() {
        val service = DocumentService(context)
        val output = ByteArrayOutputStream()
        val pdf = PdfDocument()
        try {
            for (i in 0..1) {
                val p = pdf.startPage(PdfDocument.PageInfo.Builder(300, 200, i + 1).create())
                p.canvas.drawColor(if (i == 0) Color.RED else Color.BLUE)
                p.canvas.drawRect(0f, 0f, 30f, 200f, Paint().apply { color = Color.GREEN })
                pdf.finishPage(p)
            }
            pdf.writeTo(output)
        } finally { pdf.close() }
        val token = WorkToken()
        val handle = service.importDocument(ByteArrayInputStream(output.toByteArray()), token)
        assertEquals("application/pdf", handle.mime)
        assertEquals(2, handle.pages)
        service.renderPage(handle.id, 0, 0, token).bitmap.useBitmap {
            assertEquals(Color.RED, it.getPixel(it.width / 2, it.height / 2))
        }
        service.renderPage(handle.id, 1, 90, token).bitmap.useBitmap {
            assertTrue(it.width < it.height)
            assertEquals(Color.BLUE, it.getPixel(it.width / 2, it.height / 2))
            assertEquals(Color.GREEN, it.getPixel(it.width / 2, 5))
        }
        assertThrows(IllegalArgumentException::class.java) { service.renderPage(handle.id, 2, 0, token) }
        assertThrows(IllegalArgumentException::class.java) { service.renderPage("../../outside", 0, 0, token) }
    }

    @Test fun malformedDocumentsAndCancelledCopiesCommitNothing() {
        val service = DocumentService(context)
        val before = service.listDocumentIds().toSet()
        assertThrows(IllegalArgumentException::class.java) {
            service.importDocument(ByteArrayInputStream("not a floorplan".toByteArray()), WorkToken())
        }
        val cancelled = WorkToken().apply { cancel() }
        assertThrows(CancellationException::class.java) {
            service.importDocument(ByteArrayInputStream(byteArrayOf(1, 2, 3)), cancelled)
        }
        assertEquals(before, service.listDocumentIds().toSet())
    }

    @Test fun cancellationDuringCopyRemovesItsPartialFile() {
        val service = DocumentService(context)
        val token = WorkToken()
        val before = service.listDocumentIds().toSet()
        val bytes = InstrumentationRegistry.getInstrumentation().context.assets.open("recognition/clear-plan.png").use { it.readBytes() }
        val stream = object : InputStream() {
            var cursor = 0
            override fun read(): Int {
                if (cursor == 64) token.cancel()
                if (cursor >= bytes.size) return -1
                return bytes[cursor++].toInt() and 255
            }
        }
        assertThrows(CancellationException::class.java) { service.importDocument(stream, token) }
        assertEquals(before, service.listDocumentIds().toSet())
        assertFalse(context.filesDir.walk().any { it.name.endsWith(".part") })
    }

    @Test fun jpegExifOrientationIsAppliedBeforeExposingRecognitionCoordinates() {
        val file = File.createTempFile("orientation", ".jpg", context.cacheDir)
        val bitmap = Bitmap.createBitmap(500, 200, Bitmap.Config.ARGB_8888)
        try {
            Canvas(bitmap).apply {
                drawColor(Color.BLUE)
                drawRect(0f, 0f, 50f, 200f, Paint().apply { color = Color.GREEN })
            }
            file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 100, it) }
            ExifInterface(file).apply {
                setAttribute(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_ROTATE_90.toString())
                saveAttributes()
            }
            val service = DocumentService(context)
            val handle = file.inputStream().use { service.importDocument(it, WorkToken()) }
            assertEquals("image/jpeg", handle.mime)
            service.renderPage(handle.id, 0, 0, WorkToken()).bitmap.useBitmap {
                assertEquals(200, it.width)
                assertEquals(500, it.height)
                val pixel = it.getPixel(100, 20)
                assertTrue(Color.green(pixel) > 230 && Color.blue(pixel) < 25)
            }
        } finally { bitmap.recycle(); file.delete() }
    }

    @Test fun rasterAssetsAreRealPngAndCancelledWritesDoNotPublish() {
        val service = DocumentService(context)
        Bitmap.createBitmap(320, 200, Bitmap.Config.ARGB_8888).useBitmap { bitmap ->
            bitmap.eraseColor(Color.YELLOW)
            val id = service.saveRaster(bitmap, WorkToken())
            assertTrue(id.endsWith(".png"))
            checkNotNull(android.graphics.BitmapFactory.decodeFile(service.assetFile(id).absolutePath)).useBitmap {
                assertEquals(320, it.width)
                assertEquals(Color.YELLOW, it.getPixel(100, 100))
            }
            val before = context.filesDir.walk().filter { it.isFile }.map { it.name }.toSet()
            assertThrows(CancellationException::class.java) { service.saveRaster(bitmap, WorkToken().apply { cancel() }) }
            assertEquals(before, context.filesDir.walk().filter { it.isFile }.map { it.name }.toSet())
        }
    }
}

inline fun <T> android.graphics.Bitmap.useBitmap(block: (android.graphics.Bitmap) -> T): T = try { block(this) } finally { recycle() }
