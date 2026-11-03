import SwiftUI

struct StartupView: View {

    let onClose: () -> Void

    var body: some View {
        GeometryReader { geometry in
            Button(action: onClose) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("City Trees")
                        .font(.system(size: 26, weight: .bold))
                    Text("Tap on a colored dot on the map to identify a tree!")
                        .font(.system(size: 16))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 30)
                // Keep the rightmost quarter clear for the background tree.
                .padding(.trailing, geometry.size.width * 0.24 + 12)
                .padding(.top, 24)
                .padding(.bottom, 48)
                .fixedSize(horizontal: false, vertical: true)
                .foregroundColor(Color(red: 29 / 255, green: 73 / 255, blue: 64 / 255))
                .multilineTextAlignment(.leading)
                .background {
                    GeometryReader { backgroundGeometry in
                        Image("icon_wide")
                            .resizable()
                            .scaledToFill()
                            .frame(width: backgroundGeometry.size.width, height: backgroundGeometry.size.height, alignment: .bottom)
                            .clipped()
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .contentShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.3), radius: 5, x: 0, y: 2)
            }
            .buttonStyle(.plain)
            .accessibilityHint("Tap to dismiss")
            .frame(maxWidth: .infinity)
            .position(x: geometry.size.width / 2, y: geometry.size.height * 0.4)
        }
    }
}

#Preview {
    StartupView(onClose: {})
        .padding(.horizontal, 30)
}
