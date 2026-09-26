package io.github.rewqasd.netatelier

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import java.util.concurrent.CancellationException
import java.util.concurrent.Executors

abstract class AsyncRequestPlugin : Plugin() {
    protected val gate = RequestGate()
    private val worker = Executors.newSingleThreadExecutor()
    protected fun begin(call: PluginCall): Pair<String, WorkToken>? = try {
        val id = requireNotNull(call.getString("requestId")) { "缺少任务标识" }
        Pair(id, gate.begin(id))
    } catch (e: Exception) { call.reject(e.message ?: "任务无法启动", "INVALID_OR_BUSY"); null }

    protected fun execute(call: PluginCall, id: String, token: WorkToken, operation: () -> JSObject) {
        worker.execute {
            try {
                token.check()
                val result = operation()
                token.check()
                if (gate.canPublish(id)) call.resolve(result) else call.reject("任务已取消", "CANCELLED")
            } catch (e: CancellationException) { call.reject("任务已取消", "CANCELLED") }
            catch (e: Exception) { call.reject(e.message ?: "本地处理失败", "LOCAL_PROCESSING_ERROR") }
            finally { gate.finish(id) }
        }
    }
    override fun handleOnDestroy() {
        gate.cancelAll()
        // Do not interrupt a model while it owns image memory; discard its eventual result.
        worker.shutdown()
        super.handleOnDestroy()
    }
}
