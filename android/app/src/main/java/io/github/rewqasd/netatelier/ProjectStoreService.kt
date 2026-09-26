package io.github.rewqasd.netatelier

import android.graphics.BitmapFactory
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.system.Os
import android.system.OsConstants
import java.io.File
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.util.UUID
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import java.util.zip.ZipEntry
import org.json.JSONObject
import org.json.JSONArray

data class StagedProject(val token:String,val project:String,val manifest:String)

/** Immutable assets, revision-guarded project JSON, bounded streaming portable archives. */
class ProjectStoreService(private val directory:File,private val assets:File) {
    companion object {
        private val lock=Any()
        private const val MAX_PROJECT=2L*1024*1024
        private const val MAX_ASSET=50L*1024*1024
        private const val MAX_BUNDLE=128L*1024*1024
        private val projectId=Regex("[A-Za-z0-9][A-Za-z0-9:_-]{0,119}")
        private val assetId=Regex("[A-Za-z0-9][A-Za-z0-9_.-]{0,119}")
        private val tokenId=Regex("[a-f0-9-]{36}")
    }
    init { check(directory.mkdirs()||directory.isDirectory);check(assets.mkdirs()||assets.isDirectory) }
    private fun file(id:String,suffix:String=".json"):File {require(projectId.matches(id)){"无效项目标识"};return File(directory,"$id$suffix")}
    private fun asset(id:String,root:File=assets):File {require(assetId.matches(id)){"无效附件标识"};val file=File(root,id);require(file.canonicalFile.parentFile==root.canonicalFile){"附件路径非法"};return file}
    private fun sha(file:File):String {val digest=MessageDigest.getInstance("SHA-256");file.inputStream().use {input->val buffer=ByteArray(32768);while(true){val n=input.read(buffer);if(n<0)break;digest.update(buffer,0,n)}};return digest.digest().joinToString(""){"%02x".format(it)}}
    private fun sha(text:String)=MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
    private fun boundedText(file:File,max:Long=MAX_PROJECT):String {require(file.isFile&&file.length()<=max){"数据文件缺失或过大"};return file.readText(Charsets.UTF_8)}
    private fun parseProject(text:String):JSONObject {
        require(text.toByteArray(Charsets.UTF_8).size<=MAX_PROJECT){"项目数据超过2MiB"}
        val p=JSONObject(text);require(p.get("schemaVersion")==1){"不支持的项目版本"};require(projectId.matches(p.getString("id"))){"无效项目标识"}
        require(p.getInt("revision")>=0){"无效保存版本"};require(p.getJSONArray("floors").length() in 1..20){"楼层数量须为1至20"}
        references(p);return p
    }
    private fun references(p:JSONObject):Set<String> {
        val ids=linkedSetOf<String>();val floors=p.getJSONArray("floors")
        for(i in 0 until floors.length()){val d=floors.getJSONObject(i).optJSONObject("document")?:continue
            for(key in listOf("assetId","sourceAssetId"))if(d.has(key)){val id=d.getString(key);require(assetId.matches(id)){"无效附件标识"};ids.add(id)}
        };return ids
    }
    private fun syncDirectory(dir:File){require(dir.isDirectory);val descriptor=Os.open(dir.absolutePath,OsConstants.O_RDONLY,0);try{Os.fsync(descriptor)}finally{Os.close(descriptor)}}
    private fun atomicText(destination:File,text:String){
        val temp=File(destination.parentFile,"${destination.name}.part")
        try{temp.outputStream().use{it.write(text.toByteArray(Charsets.UTF_8));it.fd.sync()};Files.move(temp.toPath(),destination.toPath(),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);syncDirectory(destination.parentFile!!)}finally{temp.delete()}
    }
    private fun readEnvelope(file:File,id:String):String {
        val envelope=JSONObject(boundedText(file,MAX_PROJECT*3));val text=envelope.getString("project")
        require(sha(text)==envelope.getString("sha256")){"项目校验值不匹配"};require(parseProject(text).getString("id")==id){"项目标识不一致"};return text
    }
    fun load(id:String):String=synchronized(lock){
        val main=file(id);try{readEnvelope(main,id)}catch(e:Exception){
            val backup=file(id,".json.bak");if(!backup.isFile)throw IllegalStateException("项目缺失或损坏，且无可恢复版本",e)
            val text=readEnvelope(backup,id);atomicText(file(id,".recovered"),JSONObject(text).getInt("revision").toString());atomicText(main,boundedText(backup,MAX_PROJECT*3));text
        }
    }
    fun wasRecovered(id:String):Boolean=synchronized(lock){file(id,".recovered").exists()}
    fun save(project:String,expectedRevision:Int):String=synchronized(lock){
        val p=parseProject(project);val id=p.getString("id");val main=file(id);val exists=main.exists()||file(id,".json.bak").exists();val current=if(exists)load(id) else null
        val revision=if(current!=null)JSONObject(current).getInt("revision") else 0
        check(expectedRevision==revision){"REVISION_CONFLICT：项目已被其他保存更新，请重新载入"}
        require(revision<Int.MAX_VALUE){"保存版本超出上限"};references(p).forEach{require(asset(it).isFile){"项目附件缺失：$it"}}
        p.put("revision",revision+1);val text=p.toString();require(text.toByteArray().size<=MAX_PROJECT){"项目数据过大"}
        if(current!=null)atomicText(file(id,".json.bak"),JSONObject().put("project",current).put("sha256",sha(current)).toString())
        atomicText(main,JSONObject().put("project",text).put("sha256",sha(text)).toString());file(id,".recovered").delete();text
    }
    fun list():List<JSONObject> = synchronized(lock){
        val ids=directory.listFiles().orEmpty().filter{it.name.endsWith(".json")||it.name.endsWith(".json.bak")}.map{it.name.removeSuffix(".bak").removeSuffix(".json")}.distinct()
        ids.map{id->try{val p=JSONObject(load(id));JSONObject().put("id",id).put("name",p.getString("name")).put("revision",p.getInt("revision")).put("updatedAt",p.getString("updatedAt")).put("recovered",wasRecovered(id))}catch(e:Exception){JSONObject().put("id",id).put("name","损坏项目（可删除或导入备份）").put("revision",0).put("updatedAt","").put("corrupt",true)}}
    }
    fun delete(id:String,confirmed:Boolean)=synchronized(lock){
        require(confirmed){"请明确确认删除"}
        // Assets remain immutable/shared; deleting one project must not remove another project's image.
        for(suffix in listOf(".json",".json.bak",".json.part",".json.bak.part",".recovered",".recovered.part")){val target=file(id,suffix);check(!target.exists()||target.delete()){"无法删除项目私有副本"}}
        syncDirectory(directory)
    }
    private fun manifest(p:JSONObject,root:File):JSONObject {
        val list=JSONArray();var total=p.toString().toByteArray().size.toLong()
        for(id in references(p)){val f=asset(id,root);require(f.isFile&&f.length() in 1..MAX_ASSET){"附件缺失或超过50MiB"};total+=f.length();require(total<=MAX_BUNDLE){"项目包超过128MiB"};list.put(JSONObject().put("id",id).put("path","assets/$id").put("bytes",f.length()).put("sha256",sha(f)))}
        require(list.length()+2<=256){"项目包条目过多"};val result=JSONObject().put("format","netatelier").put("version",1).put("project","project.json").put("assets",list);require(total+result.toString().toByteArray().size<=MAX_BUNDLE){"项目包超过128MiB"};return result
    }
    fun exportBundle(id:String,output:File)=synchronized(lock){
        val project=load(id);val p=parseProject(project);val m=manifest(p,assets);val temp=File(output.parentFile,"${output.name}.part")
        try{temp.outputStream().use{stream->ZipOutputStream(stream).use{zip->
            fun textEntry(name:String,text:String){zip.putNextEntry(ZipEntry(name));zip.write(text.toByteArray(Charsets.UTF_8));zip.closeEntry()}
            textEntry("manifest.json",m.toString());textEntry("project.json",project)
            for(assetId in references(p)){zip.putNextEntry(ZipEntry("assets/$assetId"));asset(assetId).inputStream().use{it.copyTo(zip,32768)};zip.closeEntry()};zip.finish();zip.flush();stream.fd.sync()
        }};Files.move(temp.toPath(),output.toPath(),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);syncDirectory(output.parentFile!!)}finally{temp.delete()}
    }
    private fun stageDirectory(token:String):File{require(tokenId.matches(token)){"无效导入任务"};return File(directory,".stage-$token")}
    private fun validateAsset(file:File){
        require(file.length() in 1..MAX_ASSET){"附件大小无效"}
        val header=ByteArray(8);file.inputStream().use{it.read(header)}
        if(header.copyOfRange(0,5).contentEquals("%PDF-".toByteArray())){
            ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY).use{fd->PdfRenderer(fd).use{DocumentLimits.validatePages(it.pageCount)}}
        }else{
            val options=BitmapFactory.Options().apply{inJustDecodeBounds=true};BitmapFactory.decodeFile(file.absolutePath,options)
            require(options.outMimeType in listOf("image/png","image/jpeg")){"附件必须是PNG/JPEG/PDF"};DocumentLimits.validateImage(options.outWidth,options.outHeight)
        }
    }
    fun stageBundle(input:InputStream,token:WorkToken=WorkToken()):StagedProject=synchronized(lock){
        val id=UUID.randomUUID().toString();val staging=stageDirectory(id).apply{mkdirs()};val targetAssets=File(staging,"assets").apply{mkdirs()}
        try{
            val names=linkedSetOf<String>();var expanded=0L
            ZipInputStream(input).use{zip->while(true){token.check();val entry=zip.nextEntry?:break;val name=entry.name
                require(!entry.isDirectory&&names.add(name)&&names.size<=256){"项目包存在目录、重复条目或超过256条"}
                val destination=when{ name=="manifest.json"||name=="project.json"->File(staging,name);name.startsWith("assets/")&&assetId.matches(name.removePrefix("assets/"))->asset(name.removePrefix("assets/"),targetAssets);else->throw IllegalArgumentException("项目包路径非法") }
                val bound=if(name.startsWith("assets/"))MAX_ASSET else MAX_PROJECT;var size=0L
                destination.outputStream().use{out->val buffer=ByteArray(32768);while(true){token.check();val n=zip.read(buffer);if(n<0)break;size+=n;expanded+=n;require(size<=bound&&expanded<=MAX_BUNDLE){"项目包展开大小超出上限"};out.write(buffer,0,n)};out.fd.sync()};zip.closeEntry()
            }}
            val p=parseProject(boundedText(File(staging,"project.json")));val m=JSONObject(boundedText(File(staging,"manifest.json")))
            require(m.getString("format")=="netatelier"&&m.get("version")==1&&m.getString("project")=="project.json"){"不支持的项目包版本"}
            require(m.keys().asSequence().toSet()==setOf("format","version","project","assets")){"项目包清单包含未知字段"}
            val entries=m.getJSONArray("assets");val ids=linkedSetOf<String>();require(entries.length()<=254){"附件过多"}
            for(i in 0 until entries.length()){val a=entries.getJSONObject(i);val aid=a.getString("id");require(ids.add(aid)&&a.getString("path")=="assets/$aid"){"附件名称重复或路径非法"};val f=asset(aid,targetAssets)
                require(f.isFile&&f.length()==a.getLong("bytes")&&sha(f)==a.getString("sha256")){"附件大小或校验值不匹配"};validateAsset(f)
            }
            require(ids==references(p)&&names==ids.map{"assets/$it"}.toSet()+setOf("manifest.json","project.json")){"附件引用缺失或有未声明条目"}
            val pages=p.getJSONArray("floors")
            for(i in 0 until pages.length()){val d=pages.getJSONObject(i).optJSONObject("document")?:continue;val options=BitmapFactory.Options().apply{inJustDecodeBounds=true};BitmapFactory.decodeFile(asset(d.getString("assetId"),targetAssets).absolutePath,options)
                require(options.outWidth>0&&options.outHeight>0&&maxOf(options.outWidth,options.outHeight)<=DocumentLimits.MAX_EDGE&&options.outWidth==d.getInt("widthPx")&&options.outHeight==d.getInt("heightPx")){"栅格图片实际尺寸与声明不符，或超过2400像素边长"}
            }
            // Imported projects are independent copies. Never overwrite existing project/assets by ID.
            val mapping=ids.associateWith{old->"import-${UUID.randomUUID()}.${old.substringAfterLast('.',"bin")}"}
            for((old,new) in mapping){require(assetId.matches(new));check(asset(old,targetAssets).renameTo(asset(new,targetAssets))){"无法重建附件标识"}}
            val floors=p.getJSONArray("floors");for(i in 0 until floors.length()){val d=floors.getJSONObject(i).optJSONObject("document")?:continue;for(key in listOf("assetId","sourceAssetId"))if(d.has(key))d.put(key,mapping.getValue(d.getString(key)))}
            p.put("id","p-${UUID.randomUUID()}").put("revision",0);val newManifest=manifest(p,targetAssets);atomicText(File(staging,"project.json"),p.toString());atomicText(File(staging,"manifest.json"),newManifest.toString());token.check()
            StagedProject(id,p.toString(),newManifest.toString())
        }catch(e:Exception){staging.deleteRecursively();throw e}
    }
    fun commitBundle(token:String):String=synchronized(lock){
        val dir=stageDirectory(token);val p=parseProject(boundedText(File(dir,"project.json")));require(!file(p.getString("id")).exists()){"导入项目标识冲突"}
        val source=File(dir,"assets");val m=JSONObject(boundedText(File(dir,"manifest.json")));val expected=m.getJSONArray("assets");val published=mutableListOf<File>()
        try{
            for(i in 0 until expected.length()){val a=expected.getJSONObject(i);val id=a.getString("id");val from=asset(id,source);require(from.length()==a.getLong("bytes")&&sha(from)==a.getString("sha256")){"导入暂存附件已改变"};val target=asset(id);require(!target.exists()){"附件标识冲突"};Files.move(from.toPath(),target.toPath(),StandardCopyOption.ATOMIC_MOVE);published.add(target)}
            syncDirectory(assets);val saved=save(p.toString(),0);dir.deleteRecursively();saved
        }catch(e:Exception){if(!file(p.getString("id")).exists())published.forEach{it.delete()};throw e}
    }
    fun discardBundle(token:String)=synchronized(lock){stageDirectory(token).deleteRecursively();Unit}
}
