import SwiftUI
import GoogleMaps

struct ContentView: View {

    @State private var selectedTypeIndex: Int?
    @State private var isBusy = false
    @State private var showingAbout = false
    @State private var satellite = false
    @State private var checkForNewDataCompleted = false
    @State private var isCheckingForNewData = true
    @State private var dataCheckError: String?
    @State private var dataCheckAttempt = 0

    var body: some View {
        // the map extends under the top safe area too; the overlays stay below it
        Color.clear
            .ignoresSafeArea(edges: .bottom)
            .background {
                if checkForNewDataCompleted {
                    MapView(selectedTypeIndex: $selectedTypeIndex, isBusy: $isBusy, satellite: satellite)
                        .ignoresSafeArea()
                }
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
                ZStack {
                    if isBusy {
                        BusyView(text: "Finding your location")
                            .transition(.opacity)
                    }
                }
                .animation(.easeInOut(duration: 0.3), value: isBusy)
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
            .overlay {
                ZStack {
                    if isCheckingForNewData {
                        BusyView(text: "Checking for new data")
                            .transition(.opacity)
                    }
                    else if let dataCheckError {
                        BusyView(text: dataCheckError, retry: {
                            self.dataCheckError = nil
                            self.isCheckingForNewData = true
                            self.dataCheckAttempt += 1
                        })
                            .transition(.opacity)
                    }
                }
                .animation(.easeInOut(duration: 0.3), value: isCheckingForNewData)
                .animation(.easeInOut(duration: 0.3), value: dataCheckError != nil)
            }
            .task(id: dataCheckAttempt) {
                await checkForNewData()
            }
    }

    @MainActor
    private func checkForNewData() async {
        if !checkForNewDataCompleted {
            do {
                let hasNewData = try await TreeData.checkForNewData()
                try Task.checkCancellation()
                TreeType.load(url: TreeData.localDir.appendingPathComponent("types.bin"))
                checkForNewDataCompleted = true
                isCheckingForNewData = false
            }
            catch {
                if Task.isCancelled { return }
                print("checking for new data failed: \(error)")
                dataCheckError = error.localizedDescription
                isCheckingForNewData = false
            }
        }
    }
}
