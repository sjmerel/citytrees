import SwiftUI

struct LocationButton: View {

    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image("crosshair")
                .renderingMode(.template)
                .resizable()
                .frame(width: 24, height: 24)
                .foregroundColor(Color(white: 0.35))
                .frame(width: 40, height: 40)
                .background {
                    Circle()
                        .fill(Color.white)
                        .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
                }
        }
        .accessibilityLabel("Show my location")
    }
}

#Preview {
    LocationButton() {}
        .padding()
        .background(Color.gray)
}
