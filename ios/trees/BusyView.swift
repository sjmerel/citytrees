import SwiftUI

struct BusyView: View {

    var text: String?

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
                .progressViewStyle(.circular)
                .controlSize(.large)
                .tint(.white)
            if let text {
                Text(text)
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(24)
        .background(Color.black, in: RoundedRectangle(cornerRadius: 14))
    }
}

#Preview {
    BusyView(text: "Finding your location")
}

#Preview("No text") {
    BusyView()
}
