import SwiftUI

// A modal overlay: dims the screen and blocks touches. Shows a spinner, or, if retry is given,
// the text with a Retry button (for errors).
struct BusyView: View {

    var text: String?
    var retry: (() -> Void)?

    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()
            VStack(spacing: 12) {
                if retry == nil {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .controlSize(.large)
                        .tint(.white)
                }
                if let text {
                    Text(text)
                        .font(.system(size: 14))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                }
                if let retry {
                    Button("Retry", action: retry)
                        .buttonStyle(.bordered)
                        .tint(.white)
                }
            }
            .padding(24)
            .background(Color.black, in: RoundedRectangle(cornerRadius: 14))
        }
    }
}

#Preview {
    BusyView(text: "Finding your location")
}

#Preview("No text") {
    BusyView()
}

#Preview("Error") {
    BusyView(text: "Couldn't download tree data", retry: {})
}
