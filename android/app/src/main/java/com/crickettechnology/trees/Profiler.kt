package com.crickettechnology.trees

class Profiler(private val name: String) {

    fun start() {
        this.stopwatch.reset()
        this.stopwatch.start()
    }

    fun mark(label: String) {
        val elapsedTime = this.stopwatch.elapsedTime
        println("${this.name}: ${formatTime(elapsedTime)} (${formatTime(elapsedTime - this.prevTime)}) $label")
        this.prevTime = elapsedTime
    }

    fun stop() {
        this.stopwatch.stop()
        println("${this.name}: ${formatTime(this.stopwatch.elapsedTime)} TOTAL")
    }

    companion object {
        val main = Profiler("profiler_main")
    }

    ////////////////////////////////////////

    private var prevTime: Double = 0.0
    private val stopwatch = Stopwatch()

    // must follow the property declarations, which are initialized in order
    init {
        start()
    }

    private fun formatTime(time: Double): String {
        return String.format("%.3f", time)
    }
}
