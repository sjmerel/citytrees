import UIKit

extension TreeType {

    static let palette: [UIColor] = {
        let colors = [
        UIColor(red: 0.35, green: 0.35, blue: 0.40, alpha: 1),  // other
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
        // Less common genera reuse the 12 hues, darkened to tell them apart.
        let darker = colors.dropFirst().map { color -> UIColor in
            var h: CGFloat = 0, s: CGFloat = 0, b: CGFloat = 0
            color.getHue(&h, saturation: &s, brightness: &b, alpha: nil)
            return UIColor(hue: h, saturation: min(s * 1.1, 1), brightness: b * 0.55, alpha: 1)
        }
        let palette = colors + darker
        assert(palette.count == colorCount)
        return palette
    }()
}
