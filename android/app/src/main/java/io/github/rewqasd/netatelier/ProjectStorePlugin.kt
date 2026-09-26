package io.github.rewqasd.netatelier

import android.app.Activity
import android.content.Intent
import androidx.activity.result.ActivityResult
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.JSObject
import com.getcapacitor.JSArray
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors

@CapacitorPlugin(name="ProjectStore")
class ProjectStorePlugin:Plugin() {
    private val worker=Executors.newSingleThreadExecutor()
    private val gate=RequestGate()
    private val service by lazy{ProjectStoreService(File(context.filesDir,"projects"),File(context.filesDir,"documents"))}
    private fun run(call:PluginCall,block:()->JSObject){worker.execute{try{call.resolve(block())}catch(e:Exception){val code=if(e.message?.startsWith("REVISION_CONFLICT")==true)"REVISION_CONFLICT" else "LOCAL_STORAGE_ERROR";call.reject(e.message?:"本地存储失败",code)}}}
    private fun begin(call:PluginCall):Pair<String,WorkToken>?=try{val id=requireNotNull(call.getString("requestId"));Pair(id,gate.begin(id))}catch(e:Exception){call.reject("导入/导出任务繁忙或标识无效","INVALID_OR_BUSY");null}
    @PluginMethod fun list(call:PluginCall)=run(call){JSObject().put("projects",JSArray(service.list()))}
    @PluginMethod fun load(call:PluginCall)=run(call){val id=requireNotNull(call.getString("id"));JSObject().put("project",service.load(id)).put("recovered",service.wasRecovered(id))}
    @PluginMethod fun save(call:PluginCall)=run(call){JSObject().put("project",service.save(requireNotNull(call.getString("project")),requireNotNull(call.getInt("expectedRevision"))))}
    @PluginMethod fun delete(call:PluginCall)=run(call){service.delete(requireNotNull(call.getString("id")),call.getBoolean("confirmed",false)==true);JSObject()}
    @PluginMethod fun commitBundle(call:PluginCall)=run(call){JSObject().put("project",service.commitBundle(requireNotNull(call.getString("token"))))}
    @PluginMethod fun discardBundle(call:PluginCall)=run(call){service.discardBundle(requireNotNull(call.getString("token")));JSObject()}
    @PluginMethod fun cancel(call:PluginCall){call.getString("requestId")?.let{gate.cancel(it)};call.resolve()}

    @PluginMethod fun pickBundle(call:PluginCall){
        val request=begin(call)?:return
        val intent=Intent(Intent.ACTION_OPEN_DOCUMENT).apply{type="*/*";addCategory(Intent.CATEGORY_OPENABLE);putExtra(Intent.EXTRA_LOCAL_ONLY,true);addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)}
        try{startActivityForResult(call,intent,"pickedBundle")}catch(e:Exception){gate.finish(request.first);call.reject("无法打开项目包选择器","PICKER_UNAVAILABLE")}
    }
    @ActivityCallback private fun pickedBundle(call:PluginCall?,result:ActivityResult){
        if(call==null)return;val id=call.getString("requestId")?:return call.reject("导入任务已失效","STALE_REQUEST")
        if(result.resultCode!=Activity.RESULT_OK||result.data?.data==null){gate.finish(id);call.resolve(JSObject().put("cancelled",true));return}
        worker.execute{
            var staged:StagedProject?=null
            try{val token=gate.token(id);val input=requireNotNull(context.contentResolver.openInputStream(result.data!!.data!!));staged=service.stageBundle(input,token);token.check();check(gate.canPublish(id)){"导入已取消"}
                call.resolve(JSObject().put("cancelled",false).put("token",staged.token).put("project",staged.project).put("manifest",staged.manifest))
            }catch(e:Exception){staged?.let{service.discardBundle(it.token)};call.reject(e.message?:"项目包导入失败","BUNDLE_IMPORT_ERROR")}finally{gate.finish(id)}
        }
    }
    @PluginMethod fun exportBundle(call:PluginCall){
        val (id,token)=begin(call)?:return
        worker.execute{
            var output:File?=null
            try{
                val projectId=requireNotNull(call.getString("id"));val name=org.json.JSONObject(service.load(projectId)).getString("name").map{if(it.isLetterOrDigit()||it in " _-.")it else '_'}.joinToString("").take(80)
                val exportToken=UUID.randomUUID().toString();output=File(context.cacheDir,"bundle-$exportToken.netatelier");service.exportBundle(projectId,output);token.check();call.data.put("exportToken",exportToken)
                val intent=Intent(Intent.ACTION_CREATE_DOCUMENT).apply{type="application/octet-stream";addCategory(Intent.CATEGORY_OPENABLE);putExtra(Intent.EXTRA_TITLE,"${name.ifBlank{"组网方案"}}.netatelier");putExtra(Intent.EXTRA_LOCAL_ONLY,true)}
                activity.runOnUiThread{try{token.check();startActivityForResult(call,intent,"savedBundle")}catch(e:Exception){output.delete();gate.finish(id);call.reject("无法打开保存位置选择器","PICKER_UNAVAILABLE")}}
            }catch(e:Exception){output?.delete();gate.finish(id);call.reject(e.message?:"项目包生成失败","BUNDLE_EXPORT_ERROR")}
        }
    }
    @ActivityCallback private fun savedBundle(call:PluginCall?,result:ActivityResult){
        if(call==null)return;val id=call.getString("requestId")?:return call.reject("保存任务已失效","STALE_REQUEST")
        val exportToken=call.getString("exportToken")?:return call.reject("导出文件已失效","STALE_REQUEST")
        if(!Regex("[a-f0-9-]{36}").matches(exportToken))return call.reject("无效导出标识")
        val output=File(context.cacheDir,"bundle-$exportToken.netatelier")
        if(result.resultCode!=Activity.RESULT_OK||result.data?.data==null){output.delete();gate.finish(id);call.resolve(JSObject().put("cancelled",true));return}
        worker.execute{try{val token=gate.token(id);val uri=result.data!!.data!!;require(output.isFile){"导出暂存文件已失效，请重试"}
            requireNotNull(context.contentResolver.openOutputStream(uri,"wt")).use{out->output.inputStream().use{input->val buffer=ByteArray(32768);while(true){token.check();val n=input.read(buffer);if(n<0)break;out.write(buffer,0,n)}};out.flush()};call.resolve(JSObject().put("cancelled",false).put("uri",uri.toString()))
        }catch(e:Exception){call.reject("项目包未保存完成，目标位置可能有不完整文件：${e.message}","BUNDLE_SAVE_ERROR")}finally{output.delete();gate.finish(id)}}
    }
    override fun handleOnDestroy(){gate.cancelAll();worker.shutdown();super.handleOnDestroy()}
}
