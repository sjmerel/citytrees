import SwiftUI

struct LayersButton: View {

    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image("layers")
                .renderingMode(.template)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(Color(white: 0.35))
                .frame(width: 40, height: 40)
                .background(Color.white, in: Circle())
                .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
        }
        .accessibilityLabel("Toggle map layers")
    }
}

#Preview {
    LayersButton() {}
        .padding()
        .background(Color.gray)
}
