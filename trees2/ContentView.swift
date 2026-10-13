import SwiftUI
import GoogleMaps

struct ContentView: View {
    
    @State private var targetCoordinate = CLLocationCoordinate2D(
        latitude: 34.0195,
        longitude: -118.4912
    )
    
    var body: some View {
        MapView(
            coordinate: targetCoordinate,
            zoom: 13.0
        )
        .ignoresSafeArea(edges: .bottom)
    }
}

#Preview {
    ContentView()
}
