import SwiftUI

struct SelectionCard: View {

    let type: TreeType
    let onClose: () -> Void

    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            caption("Botanical name")
                .padding(.top, 4)
            HStack(spacing: 6) {
                Circle()
                    .fill(Color(type.color))
                    .overlay(Circle().stroke(Color.black.opacity(0.4), lineWidth: 1))
                    .frame(width: 18, height: 18)
                Text(type.canonicalName)
                    .italic()
                Spacer(minLength: 8)
                if let url = type.wikipediaUrl.flatMap({ URL(string: $0) }) {
                    Button { openURL(url) } label: {
                        Image("wikipedia")
                            .resizable()
                            .scaledToFit()
                            .padding(3)
                            .frame(width: 28, height: 28)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.black, lineWidth: 1))
                    }
                    .accessibilityLabel("Open Wikipedia article")
                }
            }
            if !type.commonNames.isEmpty {
                caption("Common names")
                    .padding(.top, 12)
                Text(type.commonNames.joined(separator: ", "))
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .font(.system(size: 18))
        .foregroundColor(.black)
        .padding(.horizontal, 18)
        .padding(.vertical, 15)
        .frame(maxWidth: 800)
        .overlay(alignment: .topTrailing) {
            Button(action: onClose) {
                Image("x")
                    .renderingMode(.template)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.gray)
                    .padding(8)
            }
            .accessibilityLabel("Clear selection")
        }
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.3), radius: 5, x: 0, y: 2)
    }

    private func caption(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12))
            .foregroundColor(.gray)
    }
}

#Preview {
    SelectionCard(
        type: TreeType(canonicalName: "Platanus × acerifolia",
                       commonNames: ["London plane", "Hybrid plane", "blah blah", "boo boo"],
                       wikipediaUrl: "https://en.wikipedia.org/wiki/London_plane",
                       colorIndex: 3),
        onClose: {})
        .padding()
}
