import SwiftUI
import GoogleMaps

struct ContentView: View {

    @State private var selectedTypeIndex: Int?
    @State private var isBusy = false
    @State private var showingAbout = false
    @State private var satellite = false

    var body: some View {
        // the map extends under the top safe area too; the overlays stay below it
        Color.clear
            .ignoresSafeArea(edges: .bottom)
            .background {
                MapView(selectedTypeIndex: $selectedTypeIndex, isBusy: $isBusy, satellite: satellite)
                    .ignoresSafeArea()
            }
            .overlay(alignment: .bottomTrailing) {
                VStack(spacing: 12) {
                    LayersButton(satellite: satellite) { satellite.toggle() }
                    InfoButton { showingAbout = true }
                }
                    .padding(.trailing, 16)
                    .padding(.bottom, 80)
            }
            .sheet(isPresented: $showingAbout) {
                AboutView()
            }
            .overlay {
                if isBusy {
                    BusyView(text: "Finding your location")
                }
            }
            .overlay(alignment: .top) {
                if let selectedTypeIndex {
                    let type = TreeType.all[selectedTypeIndex]
                    SelectionCard(type: type) {
                        self.selectedTypeIndex = nil
                    }
                        .padding(12)
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: selectedTypeIndex != nil)
    }
}
