import UIKit

extension TreeType {

    var color: UIColor {
        return Self.palette[colorIndex % Self.palette.count]
    }

    // colors for various genera
    static let palette: [UIColor] = [
        UIColor(red: 255.0 / 255, green: 126.0 / 255, blue: 87.0 / 255, alpha: 1),
        UIColor(red: 229.0 / 255, green: 0, blue: 0, alpha: 1),
        UIColor(red: 255.0 / 255, green: 155.0 / 255, blue: 0, alpha: 1),
        UIColor(red: 202.0 / 255, green: 47.0 / 255, blue: 0, alpha: 1),
        UIColor(red: 200.0 / 255, green: 189.0 / 255, blue: 0, alpha: 1),
        UIColor(red: 135.0 / 255, green: 111.0 / 255, blue: 0, alpha: 1),
        UIColor(red: 91.0 / 255, green: 214.0 / 255, blue: 88.0 / 255, alpha: 1),
        UIColor(red: 0, green: 144.0 / 255, blue: 0, alpha: 1),
        UIColor(red: 0, green: 222.0 / 255, blue: 186.0 / 255, alpha: 1),
        UIColor(red: 0, green: 154.0 / 255, blue: 114.0 / 255, alpha: 1),
        UIColor(red: 0, green: 212.0 / 255, blue: 255.0 / 255, alpha: 1),
        UIColor(red: 0, green: 137.0 / 255, blue: 209.0 / 255, alpha: 1),
        UIColor(red: 60.0 / 255, green: 187.0 / 255, blue: 255.0 / 255, alpha: 1),
        UIColor(red: 0, green: 97.0 / 255, blue: 255.0 / 255, alpha: 1),
        UIColor(red: 178.0 / 255, green: 158.0 / 255, blue: 255.0 / 255, alpha: 1),
        UIColor(red: 113.0 / 255, green: 45.0 / 255, blue: 255.0 / 255, alpha: 1),
        UIColor(red: 242.0 / 255, green: 133.0 / 255, blue: 255.0 / 255, alpha: 1),
        UIColor(red: 180.0 / 255, green: 0, blue: 201.0 / 255, alpha: 1),
        UIColor(red: 255.0 / 255, green: 119.0 / 255, blue: 180.0 / 255, alpha: 1),
        UIColor(red: 219.0 / 255, green: 0, blue: 107.0 / 255, alpha: 1),
    ]
}
