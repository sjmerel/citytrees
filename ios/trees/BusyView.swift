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
            GeometryReader { geometry in
                VStack(spacing: 12) {
                    if retry == nil {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .controlSize(.large)
                            .tint(AppColors.text)
                    }
                    if let text {
                        Text(text)
                            .font(.system(size: 14))
                            .foregroundColor(AppColors.text)
                            .multilineTextAlignment(.center)
                    }
                    if let retry {
                        Button("Retry", action: retry)
                            .buttonStyle(.bordered)
                            .tint(AppColors.text)
                    }
                }
                .padding(24)
                .background(AppColors.background, in: RoundedRectangle(cornerRadius: 14))
                .position(x: geometry.size.width / 2, y: geometry.size.height * 0.4)
            }
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
