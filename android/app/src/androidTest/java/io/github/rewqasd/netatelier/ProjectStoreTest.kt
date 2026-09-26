package io.github.rewqasd.netatelier

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONObject
import org.json.JSONArray
import java.io.File
import java.io.ByteArrayOutputStream
import java.io.ByteArrayInputStream
import java.util.zip.ZipOutputStream
import java.util.zip.ZipEntry
import java.security.MessageDigest

@RunWith(AndroidJUnit4::class)
class ProjectStoreTest {
    private val context=InstrumentationRegistry.getInstrumentation().targetContext
    private fun root()=java.nio.file.Files.createTempDirectory(context.cacheDir.toPath(),"store-test-").toFile()
    private fun project(id:String="project-test")=JSONObject().put("schemaVersion",1).put("id",id).put("name","持久化样例").put("revision",0).put("updatedAt","2026-09-26T00:00:00.000Z").put("floors",JSONArray().put(JSONObject().put("id","f1").put("devices",JSONArray().put(JSONObject().put("id","ap1").put("locked",true).put("wifi",5).put("positionM",JSONObject().put("x",3.125).put("y",9.5)))))).put("priceOverrides",JSONObject().put("ap5",0))
    private fun sha(bytes:ByteArray)=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
    private fun zip(entries:List<Pair<String,ByteArray>>):ByteArray {val out=ByteArrayOutputStream();ZipOutputStream(out).use {z->for((name,bytes) in entries){z.putNextEntry(ZipEntry(name));z.write(bytes);z.closeEntry()}};return out.toByteArray()}
    private fun image()=InstrumentationRegistry.getInstrumentation().context.assets.open("recognition/clear-plan.png").use{it.readBytes()}

    @Test fun atomicRevisionRoundtripAndExplicitDelete() {
        val root=root();try{val s=ProjectStoreService(File(root,"projects"),File(root,"assets"));val p=project();val saved=JSONObject(s.save(p.toString(),0));assertEquals(1,saved.getInt("revision"));assertEquals(3.125,JSONObject(s.load(p.getString("id"))).getJSONArray("floors").getJSONObject(0).getJSONArray("devices").getJSONObject(0).getJSONObject("positionM").getDouble("x"),0.0)
            assertThrows(Exception::class.java){s.save(p.put("name","stale").toString(),0)};assertEquals("持久化样例",JSONObject(s.load("project-test")).getString("name"));assertThrows(Exception::class.java){s.delete("project-test",false)};assertEquals(1,s.list().size);s.delete("project-test",true);assertEquals(0,s.list().size)
        }finally{root.deleteRecursively()}
    }
    @Test fun interruptedOrCorruptLatestSaveRecoversPreviousGoodVersion() {
        val root=root();try{val dir=File(root,"projects");val s=ProjectStoreService(dir,File(root,"assets"));s.save(project().toString(),0);s.save(project().put("name","second").toString(),1)
            File(dir,"project-test.json.part").writeText("interrupted write");assertEquals("second",JSONObject(s.load("project-test")).getString("name"));File(dir,"project-test.json").writeText("truncated{");val reopened=ProjectStoreService(dir,File(root,"assets"));assertEquals("持久化样例",JSONObject(reopened.load("project-test")).getString("name"));assertTrue(reopened.wasRecovered("project-test"))
        }finally{root.deleteRecursively()}
    }
    @Test fun bundleMovesRealBytesIntoFreshStorageAndOriginalsAreUntouched() {
        val root=root();try{val a=File(root,"a-assets").apply{mkdirs()};val s=ProjectStoreService(File(root,"a-projects"),a);val bytes=image();File(a,"raster.png").writeBytes(bytes);File(a,"original.png").writeBytes(bytes);val p=project();p.getJSONArray("floors").getJSONObject(0).put("document",JSONObject().put("assetId","raster.png").put("sourceAssetId","original.png").put("mime","image/png").put("widthPx",1200).put("heightPx",800).put("page",0));s.save(p.toString(),0);val archive=File(root,"project.netatelier");s.exportBundle("project-test",archive)
            val b=File(root,"b-assets");val fresh=ProjectStoreService(File(root,"b-projects"),b);val stage=fresh.stageBundle(archive.inputStream());assertEquals(0,fresh.list().size);val imported=JSONObject(fresh.commitBundle(stage.token));assertNotEquals("project-test",imported.getString("id"));val doc=imported.getJSONArray("floors").getJSONObject(0).getJSONObject("document");assertArrayEquals(bytes,File(b,doc.getString("assetId")).readBytes());assertArrayEquals(bytes,File(b,doc.getString("sourceAssetId")).readBytes());assertEquals(1,fresh.list().size);fresh.delete(imported.getString("id"),true);assertArrayEquals(bytes,File(a,"original.png").readBytes())
        }finally{root.deleteRecursively()}
    }
    @Test fun declaredRasterDimensionsCannotHideDifferentImagePixels() {
        val root=root();try{val a=File(root,"assets").apply{mkdirs()};File(a,"raster.png").writeBytes(image());val s=ProjectStoreService(File(root,"projects"),a);val p=project();p.getJSONArray("floors").getJSONObject(0).put("document",JSONObject().put("assetId","raster.png").put("mime","image/png").put("widthPx",1).put("heightPx",1).put("page",0));s.save(p.toString(),0);val zip=File(root,"mismatch.netatelier");s.exportBundle("project-test",zip)
            val e=assertThrows(Exception::class.java){s.stageBundle(zip.inputStream())};assertTrue(e.message.orEmpty().contains("尺寸"));assertEquals(1,s.list().size)
        }finally{root.deleteRecursively()}
    }
    @Test fun maliciousArchivePathsUnknownVersionAndDuplicateManifestNamesLeaveSavedProjectUnchanged() {
        val root=root();try{val s=ProjectStoreService(File(root,"projects"),File(root,"assets"));s.save(project().toString(),0);val before=s.load("project-test")
            for(path in listOf("../escape","/absolute","assets/../escape","assets\\a.png")){assertThrows(Exception::class.java){s.stageBundle(ByteArrayInputStream(zip(listOf(path to byteArrayOf(1)))))} }
            val manifest=JSONObject().put("format","netatelier").put("version",2).put("project","project.json").put("assets",JSONArray());assertThrows(Exception::class.java){s.stageBundle(ByteArrayInputStream(zip(listOf("manifest.json" to manifest.toString().toByteArray(),"project.json" to project().toString().toByteArray()))))}
            manifest.put("version",1);val entry=JSONObject().put("id","a.png").put("path","assets/a.png").put("bytes",1).put("sha256",sha(byteArrayOf(1)));manifest.put("assets",JSONArray().put(entry).put(entry));assertThrows(Exception::class.java){s.stageBundle(ByteArrayInputStream(zip(listOf("manifest.json" to manifest.toString().toByteArray(),"project.json" to project().toString().toByteArray(),"assets/a.png" to byteArrayOf(1)))))}
            assertEquals(before,s.load("project-test"));assertFalse(File(root,"escape").exists())
        }finally{root.deleteRecursively()}
    }
    @Test fun actualCompressedExpansionAndEntryFloodAreBoundedBeforeCommit() {
        val root=root();try{val s=ProjectStoreService(File(root,"projects"),File(root,"assets"));val archive=File(root,"bomb.zip");ZipOutputStream(archive.outputStream()).use{z->z.putNextEntry(ZipEntry("assets/large.png"));val chunk=ByteArray(1024*1024);repeat(129){z.write(chunk)};z.closeEntry()};assertTrue(archive.length()<1024*1024);assertThrows(Exception::class.java){s.stageBundle(archive.inputStream())};assertEquals(0,s.list().size)
            val flood=zip((0..256).map{"assets/a$it.png" to byteArrayOf(1)});assertThrows(Exception::class.java){s.stageBundle(ByteArrayInputStream(flood))};assertEquals(0,s.list().size)
            // Per-file limits alone are insufficient: each of these entries is legal-sized.
            ZipOutputStream(archive.outputStream()).use{z->val chunk=ByteArray(1024*1024);repeat(3){i->z.putNextEntry(ZipEntry("assets/chunk$i.png"));repeat(45){z.write(chunk)};z.closeEntry()}}
            val error=assertThrows(Exception::class.java){s.stageBundle(archive.inputStream())};assertTrue(error.message.orEmpty().contains("展开大小"));assertEquals(0,s.list().size)
        }finally{root.deleteRecursively()}
    }
}
