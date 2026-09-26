package io.github.rewqasd.netatelier

import android.graphics.Bitmap
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import java.util.concurrent.Executor
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit

internal object OcrTask {
    // A timed-out SDK task can still be reading pixels. Only its completion may
    // recycle its private copy; the caller remains free to release its source.
    // One outstanding copy also prevents repeated timeouts accumulating memory.
    private val lease = Semaphore(1)
    fun <T> await(source: Bitmap, timeoutMs: Long = 30_000, start: (Bitmap) -> Task<T>): T {
        check(lease.tryAcquire()) { "上一项文字识别仍在结束处理中，请稍后重试" }
        val owned = try { requireNotNull(source.copy(Bitmap.Config.ARGB_8888, false)) }
            catch (e: Throwable) { lease.release(); throw e }
        val task = try { start(owned) }
            catch (e: Throwable) { owned.recycle(); lease.release(); throw e }
        task.addOnCompleteListener(Executor { it.run() }) { owned.recycle(); lease.release() }
        return Tasks.await(task, timeoutMs, TimeUnit.MILLISECONDS)
    }
}
