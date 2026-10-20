import SwiftUI
import GoogleMaps

struct ContentView: View {

    @State private var selectedTypeIndex: Int?
    @State private var isBusy = false
    @State private var showingAbout = false

    var body: some View {
        MapView(selectedTypeIndex: $selectedTypeIndex, isBusy: $isBusy)
            .ignoresSafeArea(edges: .bottom)
            .overlay(alignment: .bottomLeading) {
                InfoButton { showingAbout = true }
                    .padding(.leading, 16)
                    .padding(.bottom, 32)
            }
            .sheet(isPresented: $showingAbout) {
                AboutView()
            }
            .overlay {
                if isBusy {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                    BusyView(text: "Finding your location")
                }
            }
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
