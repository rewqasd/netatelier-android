package io.github.rewqasd.netatelier

import android.app.Activity
import android.content.Intent
import android.content.ClipData
import androidx.activity.result.ActivityResult
import androidx.core.content.FileProvider
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.JSObject
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

@CapacitorPlugin(name="LocalExport")
class ExportPlugin:Plugin(){
 private val worker=Executors.newSingleThreadExecutor()
 private val busy=AtomicBoolean(false)
 private val service by lazy{ExportService(File(context.cacheDir,"exports"))}
 private var renderer:ReportPdfRenderer?=null
 private var closed=false
 private fun begin(call:PluginCall):Boolean{if(closed||!busy.compareAndSet(false,true)){call.reject("导出任务繁忙或页面已关闭","EXPORT_BUSY");return false};return true}
 @PluginMethod fun renderReportPdf(call:PluginCall){
  if(!begin(call))return
  activity.runOnUiThread{try{val name=service.filename(call.getString("filename")?:"组网方案.pdf","application/pdf");val r=ReportPdfRenderer(activity);renderer=r;r.render(requireNotNull(call.getString("html")),name){result->renderer=null;busy.set(false);result.fold({call.resolve(JSObject().put("systemPrint",true))},{call.reject(it.message?:"PDF生成失败","PDF_RENDER_ERROR")})}}catch(e:Exception){busy.set(false);call.reject(e.message?:"PDF生成失败","PDF_RENDER_ERROR")}}
 }
 @PluginMethod fun saveArtifact(call:PluginCall){
  if(!begin(call))return
  worker.execute{var artifact:ExportFile?=null;try{val mime=requireNotNull(call.getString("mime"));val name=service.filename(call.getString("filename")?:"方案",mime);val token=call.getString("token")
   artifact=if(token!=null){require(token.endsWith(".${ExportService.MIME_EXT[mime]}")){"导出格式不匹配"};ExportFile(token,service.resolve(token),mime,name)}else service.prepare(requireNotNull(call.getString("base64")),mime,name)
   // Capacitor persists activity-result options in Android's saved-state Bundle.
   // Keep only the opaque staged-file token there, never a large image payload.
   call.data.remove("base64");call.data.put("token",artifact.token);val ready=artifact
   activity.runOnUiThread{try{check(!closed){"页面已关闭"};val intent=Intent(Intent.ACTION_CREATE_DOCUMENT).apply{type=mime;addCategory(Intent.CATEGORY_OPENABLE);putExtra(Intent.EXTRA_TITLE,ready.filename);putExtra(Intent.EXTRA_LOCAL_ONLY,true)};startActivityForResult(call,intent,"savedArtifact")}catch(e:Exception){ready.file.delete();busy.set(false);call.reject("无法打开文件保存位置：${e.message}","EXPORT_PICKER_ERROR")}}
  }catch(e:Exception){artifact?.file?.delete();busy.set(false);call.reject(e.message?:"导出失败","EXPORT_PREPARE_ERROR")}}
 }
 @ActivityCallback private fun savedArtifact(call:PluginCall?,result:ActivityResult){
  if(call==null){busy.set(false);return};val token=call.getString("token")
  worker.execute{var file:File?=null;try{file=service.resolve(requireNotNull(token));if(result.resultCode!=Activity.RESULT_OK||result.data?.data==null){call.resolve(JSObject().put("cancelled",true));return@execute};val uri=result.data!!.data!!
   requireNotNull(context.contentResolver.openOutputStream(uri,"wt")).use{out->file.inputStream().use{it.copyTo(out)};out.flush()};call.resolve(JSObject().put("cancelled",false).put("uri",uri.toString()))
  }catch(e:Exception){call.reject("未保存完成，目标位置可能有不完整文件：${e.message}","EXPORT_SAVE_ERROR")}finally{file?.delete();busy.set(false)}}
 }
 @PluginMethod fun shareArtifact(call:PluginCall){
  try{val mime=requireNotNull(call.getString("mime"));val ready=service.prepare(requireNotNull(call.getString("base64")),mime,call.getString("filename")?:"组网方案");call.data.remove("base64");val uri=FileProvider.getUriForFile(context,"${context.packageName}.fileprovider",ready.file)
   val intent=Intent(Intent.ACTION_SEND).apply{type=mime;putExtra(Intent.EXTRA_STREAM,uri);putExtra(Intent.EXTRA_TITLE,ready.filename);clipData=ClipData.newRawUri("组网方案",uri);addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)}
   activity.runOnUiThread{try{activity.startActivity(Intent.createChooser(intent,"分享组网方案"));call.resolve(JSObject().put("opened",true))}catch(e:Exception){call.reject("没有可用分享应用","SHARE_UNAVAILABLE")}}
  }catch(e:Exception){call.reject(e.message?:"分享失败","SHARE_ERROR")}
 }
 @PluginMethod fun cancel(call:PluginCall){activity.runOnUiThread{renderer?.cancel();call.resolve()}}
 override fun handleOnDestroy(){closed=true;activity.runOnUiThread{renderer?.cancel()};worker.shutdown();super.handleOnDestroy()}
}
