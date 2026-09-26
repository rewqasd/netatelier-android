package io.github.rewqasd.netatelier

import android.graphics.BitmapFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CancellationException

@RunWith(AndroidJUnit4::class)
class OfflineOcrTest {
    @Test fun bundledModelsReadChineseAndLatinWithoutNetworkOrPlayServices() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val app = instrumentation.targetContext
        val permissions = app.packageManager.getPackageInfo(app.packageName, android.content.pm.PackageManager.GET_PERMISSIONS).requestedPermissions.orEmpty()
        assertFalse("Offline app must have no INTERNET permission", permissions.contains("android.permission.INTERNET"))
        assertThrows(android.content.pm.PackageManager.NameNotFoundException::class.java) {
            app.packageManager.getPackageInfo("com.google.android.gms", 0)
        }
        val bitmap = checkNotNull(instrumentation.context.assets.open("recognition/clear-plan.png").use { BitmapFactory.decodeStream(it) })
        bitmap.useBitmap {
            OfflineTextRecognizer().use { recognizer ->
                val words = recognizer.recognize(it, WorkToken())
                val text = words.joinToString(" ") { word -> word.text }
                assertTrue(text, text.contains("厨房"))
                assertTrue(text, text.contains("101"))
                assertTrue(text, text.contains("Office"))
                assertTrue(words.all { word -> word.width > 0 && word.height > 0 && word.x >= 0 && word.y >= 0 && word.x + word.width <= bitmap.width && word.y + word.height <= bitmap.height })
            }
        }
    }

    @Test fun cancelledOcrCannotReturnAResult() {
        val bitmap = android.graphics.Bitmap.createBitmap(200, 100, android.graphics.Bitmap.Config.ARGB_8888)
        bitmap.useBitmap {
            OfflineTextRecognizer().use { recognizer ->
                assertThrows(CancellationException::class.java) { recognizer.recognize(it, WorkToken().apply { cancel() }) }
            }
        }
    }
}
