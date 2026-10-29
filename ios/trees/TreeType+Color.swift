import UIKit

extension TreeType {

    // colors for various genera
    static let palette: [UIColor] = {
        // 12 hues, plus darkened and lightened versions, are used for the most common genera
        let colors = [
        UIColor(red: 0.90, green: 0.10, blue: 0.10, alpha: 1),  // red
        UIColor(red: 1.00, green: 0.55, blue: 0.00, alpha: 1),  // orange
        UIColor(red: 0.12, green: 0.35, blue: 1.00, alpha: 1),  // blue
        UIColor(red: 0.90, green: 0.00, blue: 0.80, alpha: 1),  // magenta
        UIColor(red: 0.00, green: 0.78, blue: 0.90, alpha: 1),  // cyan
        UIColor(red: 0.50, green: 0.15, blue: 0.85, alpha: 1),  // purple
        UIColor(red: 0.10, green: 0.75, blue: 0.20, alpha: 1),  // green
        UIColor(red: 1.00, green: 0.20, blue: 0.47, alpha: 1),  // rose
        UIColor(red: 0.00, green: 0.58, blue: 0.50, alpha: 1),  // teal
        UIColor(red: 0.63, green: 0.31, blue: 0.08, alpha: 1),  // brown
        UIColor(red: 0.60, green: 0.86, blue: 0.00, alpha: 1),  // lime
        UIColor(red: 0.90, green: 0.70, blue: 0.00, alpha: 1),  // gold
        ]
        let darker = [
            UIColor(red: 92.0 / 255, green: 2.0 / 255, blue: 2.0 / 255, alpha: 1),    // red
            UIColor(red: 102.0 / 255, green: 56.0 / 255, blue: 0, alpha: 1),           // orange
            UIColor(red: 3.0 / 255, green: 31.0 / 255, blue: 102.0 / 255, alpha: 1),  // blue
            UIColor(red: 92.0 / 255, green: 0, blue: 82.0 / 255, alpha: 1),            // magenta
            UIColor(red: 0, green: 80.0 / 255, blue: 102.0 / 255, alpha: 1),           // cyan
            UIColor(red: 47.0 / 255, green: 8.0 / 255, blue: 102.0 / 255, alpha: 1),  // purple
            UIColor(red: 3.0 / 255, green: 77.0 / 255, blue: 15.0 / 255, alpha: 1),   // green
            UIColor(red: 102.0 / 255, green: 12.0 / 255, blue: 42.0 / 255, alpha: 1), // rose
            UIColor(red: 0, green: 61.0 / 255, blue: 48.0 / 255, alpha: 1),            // teal
            UIColor(red: 66.0 / 255, green: 30.0 / 255, blue: 3.0 / 255, alpha: 1),   // brown
            UIColor(red: 63.0 / 255, green: 92.0 / 255, blue: 0, alpha: 1),            // lime
            UIColor(red: 92.0 / 255, green: 71.0 / 255, blue: 0, alpha: 1),            // gold
        ]
        let lighter = [
            UIColor(red: 247.0 / 255, green: 177.0 / 255, blue: 177.0 / 255, alpha: 1), // red
            UIColor(red: 1, green: 217.0 / 255, blue: 166.0 / 255, alpha: 1),              // orange
            UIColor(red: 184.0 / 255, green: 200.0 / 255, blue: 1, alpha: 1),              // blue
            UIColor(red: 247.0 / 255, green: 177.0 / 255, blue: 239.0 / 255, alpha: 1), // magenta
            UIColor(red: 166.0 / 255, green: 239.0 / 255, blue: 247.0 / 255, alpha: 1), // cyan
            UIColor(red: 208.0 / 255, green: 177.0 / 255, blue: 240.0 / 255, alpha: 1), // purple
            UIColor(red: 166.0 / 255, green: 233.0 / 255, blue: 172.0 / 255, alpha: 1), // green
            UIColor(red: 1, green: 179.0 / 255, blue: 202.0 / 255, alpha: 1),              // rose
            UIColor(red: 166.0 / 255, green: 219.0 / 255, blue: 211.0 / 255, alpha: 1), // teal
            UIColor(red: 216.0 / 255, green: 179.0 / 255, blue: 154.0 / 255, alpha: 1), // brown
            UIColor(red: 217.0 / 255, green: 240.0 / 255, blue: 166.0 / 255, alpha: 1), // lime
            UIColor(red: 247.0 / 255, green: 227.0 / 255, blue: 166.0 / 255, alpha: 1), // gold
        ]

        // gray for all other genera
        let other = UIColor(red: 0.35, green: 0.35, blue: 0.40, alpha: 1)

        let palette = [other] + colors + darker + lighter
        assert(palette.count == colorCount)
        return palette
    }()
}
