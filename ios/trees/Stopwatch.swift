import Foundation

class Stopwatch {

    func start() {
        if (self.startTime == nil) {
            self.startTime = Date()
        }
    }

    func stop() {
        if let startTime = self.startTime {
            self.elapsed += Date().timeIntervalSince(startTime)
            self.startTime = nil
        }
    }

    func reset() {
        self.elapsed = 0
        if (self.startTime != nil) {
            self.startTime = Date()
        }
    }

    var isRunning: Bool {
        return self.startTime != nil
    }

    var elapsedTime: TimeInterval {
        var elapsedTime = self.elapsed
        if let startTime = self.startTime {
            elapsedTime += Date().timeIntervalSince(startTime)
        }
        return elapsedTime
    }

    ////////////////////////////////////////

    private var startTime: Date?
    private var elapsed: TimeInterval = 0
}


