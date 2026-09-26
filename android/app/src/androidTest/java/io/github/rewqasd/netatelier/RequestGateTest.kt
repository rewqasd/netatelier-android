package io.github.rewqasd.netatelier

import androidx.test.ext.junit.runners.AndroidJUnit4
import java.util.concurrent.CancellationException
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class RequestGateTest {
    @Test fun rejectsConcurrentWorkAndMakesCancelledCompletionStale() {
        val gate = RequestGate()
        val first = gate.begin("request-1")
        assertThrows(IllegalStateException::class.java) { gate.begin("request-2") }
        gate.cancel("unrelated")
        first.check()
        gate.cancel("request-1")
        assertThrows(CancellationException::class.java) { first.check() }
        assertFalse(gate.canPublish("request-1"))
        gate.finish("request-1")
        gate.begin("request-2")
        assertFalse(gate.canPublish("request-1"))
        assertTrue(gate.canPublish("request-2"))
        gate.finish("request-1")
        assertTrue(gate.canPublish("request-2"))
    }
}
