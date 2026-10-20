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
