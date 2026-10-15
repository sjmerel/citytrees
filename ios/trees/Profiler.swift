import Foundation

class Profiler {

    init(name: String) {
        self.name = name
        start()
    }

    func start() {
        self.stopwatch.reset()
        self.stopwatch.start()
    }

    func mark(label: String) {
        let elapsedTime = self.stopwatch.elapsedTime
        print("\(self.name): \(formatTime(elapsedTime)) (\(formatTime(elapsedTime - self.prevTime))) \(label)")
        self.prevTime = elapsedTime
    }

    func stop() {
        self.stopwatch.stop()
        print("\(self.name): \(formatTime(self.stopwatch.elapsedTime)) TOTAL")
    }

    static let main = Profiler(name: "profiler_main")

    ////////////////////////////////////////

    private let name: String
    private var prevTime: TimeInterval = 0
    private let stopwatch = Stopwatch()

    private func formatTime(_ time: TimeInterval) -> String {
        return String(format:"%.3f", time)
    }
}

