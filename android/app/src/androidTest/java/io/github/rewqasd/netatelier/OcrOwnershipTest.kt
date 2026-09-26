package io.github.rewqasd.netatelier

import android.graphics.Bitmap
import com.google.android.gms.tasks.TaskCompletionSource
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.TimeoutException

@RunWith(AndroidJUnit4::class)
class OcrOwnershipTest {
    @Test fun timedOutInferenceKeepsItsPixelsUntilCompletionAndBoundsOutstandingCopies() {
        val source = Bitmap.createBitmap(20, 20, Bitmap.Config.ARGB_8888)
        val pending = TaskCompletionSource<String>()
        var owned: Bitmap? = null
        try {
            assertThrows(TimeoutException::class.java) {
                OcrTask.await<String>(source, 1) { bitmap -> owned = bitmap; pending.task }
            }
            assertNotSame(source, owned)
            source.recycle()
            assertFalse("SDK is still reading its own bitmap", owned!!.isRecycled)
            val next = Bitmap.createBitmap(10, 10, Bitmap.Config.ARGB_8888)
            try {
                assertThrows(IllegalStateException::class.java) { OcrTask.await<String>(next, 1) { pending.task } }
            } finally { next.recycle() }
        } finally { pending.trySetResult("late"); if (!source.isRecycled) source.recycle() }
        assertTrue("completion must release retained pixels", owned.isRecycled)
    }

    @Test fun immediateProcessingFailureReleasesLeaseAndLeavesCallerBitmapUsable() {
        val source = Bitmap.createBitmap(20, 20, Bitmap.Config.ARGB_8888)
        var owned: Bitmap? = null
        try {
            assertThrows(IllegalArgumentException::class.java) {
                OcrTask.await<String>(source, 100) { bitmap -> owned = bitmap; throw IllegalArgumentException("model failure") }
            }
            assertTrue(owned!!.isRecycled)
            assertFalse(source.isRecycled)
            assertEquals("done", OcrTask.await(source, 100) { com.google.android.gms.tasks.Tasks.forResult("done") })
        } finally { source.recycle() }
    }
}
