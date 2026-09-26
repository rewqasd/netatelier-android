package io.github.rewqasd.netatelier

import android.graphics.Bitmap
import java.io.Closeable
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.util.concurrent.atomic.AtomicBoolean

data class OcrWord(val text: String, val x: Int, val y: Int, val width: Int, val height: Int)
class OfflineTextRecognizer: Closeable {
    private val busy = AtomicBoolean(false)
    private val chinese by lazy { TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build()) }
    private val latin by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }
    fun recognize(bitmap: Bitmap, token: WorkToken): List<OcrWord> {
        token.check()
        check(busy.compareAndSet(false, true)) { "已有识别任务正在处理" }
        try {
            DocumentLimits.validateImage(bitmap.width, bitmap.height)
            require(maxOf(bitmap.width, bitmap.height) <= DocumentLimits.MAX_EDGE) { "请先缩放图片再识别" }
            val words = mutableListOf<OcrWord>()
            for (recognizer in listOf(chinese, latin)) {
                token.check()
                val result = OcrTask.await(bitmap) { owned -> recognizer.process(InputImage.fromBitmap(owned, 0)) }
                token.check()
                for (block in result.textBlocks) for (line in block.lines) {
                    val bounds = line.boundingBox ?: continue
                    val x = bounds.left.coerceIn(0, bitmap.width)
                    val y = bounds.top.coerceIn(0, bitmap.height)
                    val width = bounds.right.coerceIn(x, bitmap.width) - x
                    val height = bounds.bottom.coerceIn(y, bitmap.height) - y
                    if (width == 0 || height == 0 || line.text.isBlank()) continue
                    val word = OcrWord(line.text, x, y, width, height)
                    if (words.none { existing -> duplicate(existing, word) }) words.add(word)
                }
            }
            token.check()
            return words
        } finally { busy.set(false) }
    }
    private fun duplicate(a: OcrWord, b: OcrWord): Boolean {
        if (a.text.filterNot { it.isWhitespace() } != b.text.filterNot { it.isWhitespace() }) return false
        val intersection = maxOf(0, minOf(a.x + a.width, b.x + b.width) - maxOf(a.x, b.x)) * maxOf(0, minOf(a.y + a.height, b.y + b.height) - maxOf(a.y, b.y))
        val union = a.width * a.height + b.width * b.height - intersection
        return union > 0 && intersection.toDouble() / union > 0.7
    }
    override fun close() { chinese.close(); latin.close() }
}
