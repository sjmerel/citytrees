import SwiftUI
import GoogleMaps

struct ContentView: View {

    @State private var selectedTypeIndex: Int?
    @State private var isBusy = false
    @State private var showingAbout = false

    var body: some View {
        // the map extends under the top safe area too; the overlays stay below it
        Color.clear
            .ignoresSafeArea(edges: .bottom)
            .background {
                MapView(selectedTypeIndex: $selectedTypeIndex, isBusy: $isBusy)
                    .ignoresSafeArea()
            }
            .overlay(alignment: .bottomTrailing) {
                InfoButton { showingAbout = true }
                    .padding(.trailing, 16)
                    .padding(.bottom, 80)
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
                        .padding(12)
                }
            }
    }
}

