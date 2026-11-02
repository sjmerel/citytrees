import SwiftUI

// A round button styled like the Google Maps compass button: white, with a soft shadow.
struct InfoButton: View {

    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image("info")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(Color(white: 0.35))
                .frame(width: 40, height: 40)
                .background(Color.white, in: Circle())
                .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
        }
        .accessibilityLabel("About")
    }
}

#Preview {
    InfoButton {}
        .padding()
        .background(Color.gray)
}
