import SwiftUI

struct StartupView: View {

    let secondsRemaining: Int
    let onClose: () -> Void

    var body: some View {
        GeometryReader { geometry in
            let cardWidth = min(geometry.size.width, 400)
            Button(action: onClose) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("City Trees")
                        .font(.system(size: 26, weight: .bold))
                    Text("Tap on a colored dot on the map to identify a tree!")
                        .font(.system(size: 16))
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Tap to dismiss... \(secondsRemaining)")
                        .font(.system(size: 14))
                        .opacity(0.3)
                        .padding(.top, 12)
                        //.foregroundColor(Color(red: 58 / 255, green: 112 / 255, blue: 102 / 255))
                        .monospacedDigit()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 30)
                // Keep the rightmost quarter clear for the background tree.
                .padding(.trailing, cardWidth * 0.24 + 12)
                .padding(.top, 24)
                .padding(.bottom, 50)
                .fixedSize(horizontal: false, vertical: true)
                .foregroundColor(Color(red: 29 / 255, green: 73 / 255, blue: 64 / 255))
                .multilineTextAlignment(.leading)
                .background {
                    GeometryReader { backgroundGeometry in
                        Image("icon_wide")
                            .resizable()
                            .frame(width: backgroundGeometry.size.width, height: backgroundGeometry.size.width / 2)
                            .frame(width: backgroundGeometry.size.width, height: backgroundGeometry.size.height, alignment: .bottom)
                            .clipped()
                    }
                }
                .background(Color(red: 241 / 255, green: 248 / 255, blue: 247 / 255))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .contentShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.3), radius: 5, x: 0, y: 2)
            }
            .buttonStyle(.plain)
            .accessibilityHint("Tap to dismiss")
            .frame(width: cardWidth)
            .position(x: geometry.size.width / 2, y: geometry.size.height * 0.4)
        }
    }
}

#Preview {
    StartupView(secondsRemaining: 5, onClose: {})
        .padding(.horizontal, 30)
}
