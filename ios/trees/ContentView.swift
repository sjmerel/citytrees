import SwiftUI
import GoogleMaps

struct ContentView: View {

    @State private var selectedTypeIndex: Int?
    @State private var isBusy = false
    @State private var showingAbout = false
    @State private var satellite = false
    @State private var locationEnabled = UserDefaults.standard.bool(forKey: "hasShownAbout")
    @State private var isLocationAuthorized = false
    @State private var locationRequest = 0
    @State private var tileDownloadFailed = false
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
                    MapView(selectedTypeIndex: $selectedTypeIndex, isBusy: $isBusy, tileDownloadFailed: $tileDownloadFailed, satellite: satellite, locationEnabled: locationEnabled, isLocationAuthorized: $isLocationAuthorized, locationRequest: locationRequest)
                        .ignoresSafeArea()
                }
            }
            .overlay(alignment: .bottomTrailing) {
                VStack(spacing: 12) {
                    if isLocationAuthorized {
                        LocationButton { locationRequest += 1 }
                    }
                    LayersButton() { satellite.toggle() }
                    InfoButton { showingAbout = true }
                }
                    .padding(.trailing, 16)
                    .padding(.bottom, 50)
            }
            .sheet(isPresented: $showingAbout, onDismiss: { locationEnabled = true }) {
                AboutView()
                    .onAppear {
                        UserDefaults.standard.set(true, forKey: "hasShownAbout")
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
            .overlay {
                ZStack {
                    if isBusy {
                        BusyView(text: "Finding your location")
                            .transition(.opacity)
                    }
                }
                .animation(.easeInOut(duration: 0.3), value: isBusy)
            }
            .overlay(alignment: .bottom) {
                if tileDownloadFailed {
                    Text("Data download failed; some trees may be missing.")
                        .font(.system(size: 13))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.black.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .shadow(color: .black.opacity(0.3), radius: 5, x: 0, y: 2)
                        .padding(12)
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: tileDownloadFailed)
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
                try await Dataset.instance.checkForNewData()
                try Task.checkCancellation()
                TreeType.load(url: Dataset.instance.localDir.appendingPathComponent("types.bin"))
                checkForNewDataCompleted = true
                isCheckingForNewData = false
                if !UserDefaults.standard.bool(forKey: "hasShownAbout") {
                    showingAbout = true
                }
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
