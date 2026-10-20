import SwiftUI
import GoogleMaps

struct ContentView: View {

    @State private var selectedTypeIndex: Int?

    var body: some View {
        MapView(selectedTypeIndex: $selectedTypeIndex)
            .ignoresSafeArea(edges: .bottom)
            .overlay(alignment: .top) {
                if let selectedTypeIndex {
                    SelectionCard(type: TreeType.all[selectedTypeIndex], colorIndex: Int(TreeType.colorIndices[selectedTypeIndex])) {
                        self.selectedTypeIndex = nil
                    }
                        .padding(5)
                }
            }
    }
}

struct SelectionCard: View {

    let type: TreeType
    let colorIndex: Int
    let onClose: () -> Void

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
                    .padding(.top, 6)
                Text(type.commonNames.joined(separator: ", "))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
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
