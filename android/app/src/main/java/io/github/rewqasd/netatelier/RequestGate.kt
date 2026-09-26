package io.github.rewqasd.netatelier

class RequestGate {
    private var current: Pair<String, WorkToken>? = null
    @Synchronized fun begin(id: String): WorkToken {
        require(Regex("[A-Za-z0-9_-]{1,100}").matches(id)) { "无效任务标识" }
        check(current == null) { "已有任务正在处理，请稍候" }
        return WorkToken().also { current = Pair(id, it) }
    }
    @Synchronized fun token(id: String): WorkToken {
        check(current?.first == id) { "任务已过期" }
        return current!!.second
    }
    @Synchronized fun cancel(id: String) { if (current?.first == id) current?.second?.cancel() }
    @Synchronized fun cancelAll() { current?.second?.cancel() }
    @Synchronized fun finish(id: String) { if (current?.first == id) current = null }
    @Synchronized fun canPublish(id: String): Boolean {
        if (current?.first != id) return false
        return try { current!!.second.check(); true } catch (_: java.util.concurrent.CancellationException) { false }
    }
}
