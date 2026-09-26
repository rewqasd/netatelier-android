package io.github.rewqasd.netatelier
import java.io.File
import java.util.UUID
import android.util.Base64
data class ExportFile(val token:String,val file:File,val mime:String,val filename:String)
class ExportService(private val directory:File){
 companion object{const val MAX_BYTES=20*1024*1024;val MIME_EXT=mapOf("image/svg+xml" to "svg","image/png" to "png","text/csv" to "csv","application/pdf" to "pdf")}
 init{directory.mkdirs()}
 fun filename(value:String,mime:String):String{val ext=requireNotNull(MIME_EXT[mime]){"不支持的导出格式"};val clean=value.map{if(it.isLetterOrDigit()||it in " _-.（）")it else '_'}.joinToString("").take(90).trim('.',' ');return if(clean.endsWith(".$ext"))clean else "${clean.ifBlank{"组网方案"}}.$ext"}
 fun allocate(mime:String,name:String):ExportFile{val token="${UUID.randomUUID()}.${requireNotNull(MIME_EXT[mime])}";return ExportFile(token,File(directory,token),mime,filename(name,mime))}
 fun prepare(base64:String,mime:String,filename:String):ExportFile{
  require(base64.length<=((MAX_BYTES+2)/3)*4){"导出文件超过20MiB"};require(base64.isNotEmpty()&&base64.length%4==0&&Regex("[A-Za-z0-9+/]+={0,2}").matches(base64)){"导出编码无效"}
  val bytes=Base64.decode(base64,Base64.NO_WRAP);require(bytes.size<=MAX_BYTES){"导出文件超过20MiB"};require(mime!="application/pdf"){"PDF必须使用本机渲染"}
  when(mime){"image/png"->require(bytes.take(8).toByteArray().contentEquals(byteArrayOf(-119,80,78,71,13,10,26,10))){"PNG文件格式无效"};"image/svg+xml"->require(String(bytes,Charsets.UTF_8).trimStart().startsWith("<svg")){"SVG格式无效"};"text/csv"->{};else->throw IllegalArgumentException("导出格式无效")}
  val result=allocate(mime,filename);try{result.file.outputStream().use{it.write(bytes);it.fd.sync()};return result}catch(e:Exception){result.file.delete();throw e}
 }
 fun resolve(token:String):File{require(Regex("[a-f0-9-]{36}\\.(png|svg|csv|pdf)").matches(token)){"无效导出文件标识"};val f=File(directory,token);require(f.canonicalFile.parentFile==directory.canonicalFile&&f.isFile){"导出文件已失效，请重新生成"};return f}
}
