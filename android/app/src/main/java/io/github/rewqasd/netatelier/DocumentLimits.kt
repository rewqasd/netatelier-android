package io.github.rewqasd.netatelier

object DocumentLimits {
    const val MAX_BYTES = 50L * 1024 * 1024
    const val MAX_PIXELS = 24_000_000L
    const val MAX_EDGE = 2400
    fun validateBytes(bytes: Long) { require(bytes in 1..MAX_BYTES) { "文件必须在50MiB以内" } }
    fun validateImage(width: Int, height: Int) {
        require(width > 0 && height > 0 && width.toLong() * height <= MAX_PIXELS) { "图片尺寸无效或超过2400万像素" }
    }
    fun validatePages(pages: Int) { require(pages in 1..60) { "PDF页数必须在1至60页之间" } }
    fun rasterSize(width: Int, height: Int): Pair<Int, Int> {
        require(width > 0 && height > 0) { "页面尺寸无效" }
        val ratio = minOf(1.0, MAX_EDGE.toDouble() / maxOf(width, height))
        return Pair(maxOf(1, kotlin.math.round(width * ratio).toInt()), maxOf(1, kotlin.math.round(height * ratio).toInt()))
    }
}
