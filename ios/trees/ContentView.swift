import SwiftUI
import GoogleMaps

struct ContentView: View {
    
    var body: some View {
        MapView()
        .ignoresSafeArea(edges: .bottom)
    }
}

#Preview {
    ContentView()
}
