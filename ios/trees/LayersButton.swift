import SwiftUI

struct LayersButton: View {

    let satellite: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: satellite ? "map" : "square.3.layers.3d")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(Color(white: 0.35))
                .frame(width: 40, height: 40)
                .background(Color.white, in: Circle())
                .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
        }
        .accessibilityLabel(satellite ? "Show map" : "Show satellite")
    }
}

#Preview {
    LayersButton(satellite: false) {}
        .padding()
        .background(Color.gray)
}
