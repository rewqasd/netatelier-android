package io.github.rewqasd.netatelier

import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "MobileShell")
class MobileShellPlugin : Plugin() {
    private var immersive = false
    private var callback: OnBackPressedCallback? = null
    override fun load() {
        activity.runOnUiThread {
            callback = object : OnBackPressedCallback(false) {
                override fun handleOnBackPressed() { bridge.triggerWindowJSEvent("netatelier-back") }
            }.also { activity.onBackPressedDispatcher.addCallback(activity, it) }
        }
    }
    @PluginMethod fun configure(call: PluginCall) {
        activity.runOnUiThread {
            immersive = call.getBoolean("immersive", false) == true
            callback?.isEnabled = call.getBoolean("backEnabled", false) == true
            val controller = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
            controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            if (immersive) controller.hide(WindowInsetsCompat.Type.systemBars()) else controller.show(WindowInsetsCompat.Type.systemBars())
            call.resolve()
        }
    }
    @PluginMethod fun state(call: PluginCall) {
        activity.runOnUiThread {
            val insets = ViewCompat.getRootWindowInsets(activity.window.decorView)
            call.resolve(JSObject().put("immersive", immersive)
                .put("statusVisible", insets?.isVisible(WindowInsetsCompat.Type.statusBars()) ?: true)
                .put("navigationVisible", insets?.isVisible(WindowInsetsCompat.Type.navigationBars()) ?: true))
        }
    }
    @PluginMethod fun getSelection(call: PluginCall) {
        call.resolve(JSObject().put("id", context.getSharedPreferences("navigation", android.content.Context.MODE_PRIVATE).getString("project", null)))
    }
    @PluginMethod fun setSelection(call: PluginCall) {
        val id = call.getString("id")
        if (id != null && !Regex("[A-Za-z0-9][A-Za-z0-9:_-]{0,119}").matches(id)) { call.reject("无效项目标识"); return }
        val edit = context.getSharedPreferences("navigation", android.content.Context.MODE_PRIVATE).edit()
        if (id == null) edit.remove("project") else edit.putString("project", id)
        if (edit.commit()) call.resolve() else call.reject("无法保存当前项目入口")
    }
    override fun handleOnDestroy() { activity.runOnUiThread { callback?.remove(); callback = null } }
}
