package com.crickettechnology.trees

class Stopwatch {

    fun start() {
        if (this.startTime == null) {
            this.startTime = now()
        }
    }

    fun stop() {
        val startTime = this.startTime
        if (startTime != null) {
            this.elapsed += now() - startTime
            this.startTime = null
        }
    }

    fun reset() {
        this.elapsed = 0.0
        if (this.startTime != null) {
            this.startTime = now()
        }
    }

    val isRunning: Boolean
        get() { return this.startTime != null }

    // seconds
    val elapsedTime: Double
        get() {
            var elapsedTime = this.elapsed
            val startTime = this.startTime
            if (startTime != null) {
                elapsedTime += now() - startTime
            }
            return elapsedTime
        }

    ////////////////////////////////////////

    private var startTime: Double? = null
    private var elapsed: Double = 0.0

    // seconds, from a monotonic clock
    private fun now(): Double {
        return System.nanoTime() / 1e9
    }
}
