package io.github.rewqasd.netatelier

import android.app.Activity
import android.content.Context
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream

/** Public Android print API: the system owns PDF rendering, destination and cancellation. */
class ReportPdfRenderer(private val activity:Activity){
 private val handler=Handler(Looper.getMainLooper())
 private var web:WebView?=null
 private var done:((Result<Unit>)->Unit)?=null
 private val timeout=Runnable{finish(Result.failure(IllegalStateException("报告加载超时，请缩小图片后重试")))}
 fun render(html:String,filename:String,done:(Result<Unit>)->Unit){
  check(Looper.myLooper()==Looper.getMainLooper());check(this.done==null){"正在生成PDF"};this.done=done
  if(html.length>40*1024*1024){finish(Result.failure(IllegalArgumentException("报告内容过大")));return}
  try{
   handler.postDelayed(timeout,60000);val view=WebView(activity);web=view
   view.settings.apply{javaScriptEnabled=false;allowFileAccess=false;allowContentAccess=false;blockNetworkLoads=true;defaultTextEncodingName="UTF-8"}
   var started=false
   view.webViewClient=object:WebViewClient(){
    override fun shouldOverrideUrlLoading(view:WebView?,request:WebResourceRequest?)=true
    override fun shouldInterceptRequest(view:WebView?,request:WebResourceRequest?):WebResourceResponse?=if(request?.url?.scheme=="data")null else WebResourceResponse("text/plain","UTF-8",ByteArrayInputStream(ByteArray(0)))
    override fun onPageFinished(view:WebView,url:String){if(started||this@ReportPdfRenderer.done==null)return;started=true;handler.removeCallbacks(timeout);try{print(view,filename)}catch(e:Exception){finish(Result.failure(e))}}
   }
   view.loadDataWithBaseURL(null,html,"text/html","UTF-8",null)
  }catch(e:Exception){finish(Result.failure(e))}
 }
 private fun print(view:WebView,filename:String){
  val a=view.createPrintDocumentAdapter(filename)
  val wrapper=object:PrintDocumentAdapter(){
   override fun onStart(){a.onStart()}
   override fun onLayout(old:PrintAttributes?,new:PrintAttributes,signal:CancellationSignal,callback:LayoutResultCallback,extras:Bundle?){a.onLayout(old,new,signal,callback,extras)}
   override fun onWrite(pages:Array<PageRange>,destination:ParcelFileDescriptor,signal:CancellationSignal,callback:WriteResultCallback){a.onWrite(pages,destination,signal,callback)}
   override fun onFinish(){a.onFinish();finish(Result.success(Unit))}
  }
  val attributes=PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).setResolution(PrintAttributes.Resolution("pdf","PDF",300,300)).setMinMargins(PrintAttributes.Margins.NO_MARGINS).setColorMode(PrintAttributes.COLOR_MODE_COLOR).build()
  val manager=activity.getSystemService(Context.PRINT_SERVICE) as? PrintManager?:throw IllegalStateException("本机没有系统打印服务")
  manager.print(filename.removeSuffix(".pdf"),wrapper,attributes)
 }
 fun cancel(){if(Looper.myLooper()!=Looper.getMainLooper()){handler.post{cancel()};return};finish(Result.failure(java.util.concurrent.CancellationException("已取消报告加载")))}
 private fun finish(result:Result<Unit>){val callback=done?:return;done=null;handler.removeCallbacks(timeout);web?.stopLoading();web?.destroy();web=null;callback(result)}
}
