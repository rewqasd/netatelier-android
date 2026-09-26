package io.github.rewqasd.netatelier

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import android.util.Base64
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class ExportTest {
 private val context=InstrumentationRegistry.getInstrumentation().targetContext
 @Test fun artifactBytesHaveSafeOpaqueIdentityAndExactContent(){
  val root=java.nio.file.Files.createTempDirectory(context.cacheDir.toPath(),"export-test-").toFile();try{val service=ExportService(root);val body="\uFEFF报价,中文\r\n合计,6317.00\r\n";val result=service.prepare(Base64.encodeToString(body.toByteArray(),Base64.NO_WRAP),"text/csv","../../费用.csv");assertEquals(body,service.resolve(result.token).readText());assertFalse(result.filename.contains('/'));assertEquals(root.canonicalFile,result.file.canonicalFile.parentFile)
   assertThrows(Exception::class.java){service.resolve("../../secret")};assertThrows(Exception::class.java){service.prepare("??","image/png","broken.png")};assertThrows(Exception::class.java){service.prepare(Base64.encodeToString("not png".toByteArray(),Base64.NO_WRAP),"image/png","fake.png")};assertThrows(Exception::class.java){service.prepare(Base64.encodeToString(ByteArray(21*1024*1024),Base64.NO_WRAP),"text/csv","huge.csv")}
  }finally{root.deleteRecursively()}
 }
 // Real PDF save/reopen is exercised through the public system print UI in android-export-smoke.mjs.
 @Test fun oversizedReportFailsBeforeOpeningSystemPrint(){
  val latch=CountDownLatch(1);var message="";ActivityScenario.launch(MainActivity::class.java).use{scenario->scenario.onActivity{activity->ReportPdfRenderer(activity).render("a".repeat(40*1024*1024+1),"test.pdf"){result->message=result.exceptionOrNull()?.message.orEmpty();latch.countDown()}};assertTrue(latch.await(10,TimeUnit.SECONDS));assertTrue(message.contains("过大"))}
 }
 @Test fun cancelledPdfLoadingReleasesTheRequest(){
  val latch=CountDownLatch(1);var failed=false
  ActivityScenario.launch(MainActivity::class.java).use{scenario->scenario.onActivity{activity->val renderer=ReportPdfRenderer(activity);renderer.render("<html><body>取消</body></html>","cancelled.pdf"){result->failed=result.isFailure;latch.countDown()};renderer.cancel()};assertTrue(latch.await(10,TimeUnit.SECONDS));assertTrue(failed)}
 }
}
