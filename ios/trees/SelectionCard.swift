import SwiftUI

struct SelectionCard: View {

    let type: TreeType
    let colorIndex: Int
    let onClose: () -> Void

    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            caption("Botanical name")
            HStack(spacing: 6) {
                Circle()
                    .fill(Color(TreeType.palette[colorIndex]))
                    .overlay(Circle().stroke(Color.black.opacity(0.4), lineWidth: 1))
                    .frame(width: 16, height: 16)
                Text(type.canonicalName)
                    .italic()
            }
            if !type.commonNames.isEmpty {
                caption("Common names")
                    .padding(.top, 12)
                Text(type.commonNames.joined(separator: ", "))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .bottomTrailing) {
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
                .padding(.trailing, 5)
            }
        }
        .overlay(alignment: .topTrailing) {
            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.gray)
                    .padding(8)
            }
            .accessibilityLabel("Clear selection")
            .padding(-8)
        }
        .font(.system(size: 16))
        .foregroundColor(.black)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.3), radius: 5, x: 0, y: 2)
    }

    private func caption(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11))
            .foregroundColor(.gray)
    }
}

#Preview {
    SelectionCard(
        type: TreeType(canonicalName: "Platanus × acerifolia",
                       //commonNames: ["London plane", "Hybrid plane"],
                       wikipediaUrl: "https://en.wikipedia.org/wiki/London_plane",
                       colorIndex: 3),
        colorIndex: 3,
        onClose: {})
        .padding()
}
