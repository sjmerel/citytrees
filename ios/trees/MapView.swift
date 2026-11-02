import SwiftUI
import GoogleMaps
import CoreLocation

struct MapView: UIViewRepresentable {

    // Type index of the selected site, shown by the selection card in ContentView.
    @Binding var selectedTypeIndex: Int?

    // True while waiting for the device location; shown by BusyView in ContentView.
    @Binding var isBusy: Bool

    // Satellite imagery instead of the normal map.
    var satellite: Bool

    ////////////////////////////////////////

    func makeUIView(context: Context) -> GMSMapView {
        let mapView = GMSMapView()
        if let saved = SavedCamera.load() {
            mapView.camera = saved
        }
        else {
            let southWest = CLLocationCoordinate2D(latitude: -85.0, longitude: -180.0)
            let northEast = CLLocationCoordinate2D(latitude: 85.0, longitude: 180.0)
            let bounds = GMSCoordinateBounds(coordinate: southWest, coordinate: northEast)
            mapView.moveCamera(GMSCameraUpdate.fit(bounds, withPadding: 0))
        }
        mapView.delegate = context.coordinator

        // the layer is kept by the coordinator, since this struct is recreated on every SwiftUI update
        let tileLayer = context.coordinator.tileLayer
        tileLayer.map = mapView

        // when a tile downloads, clear cache to show it
        TileDb.instance.onTilesDownloaded = { [weak tileLayer] in
            tileLayer?.clearTileCache()
        }

        context.coordinator.configureLocation(for: mapView)

        // custom map style
        do 
        {
            let styleUrl = Bundle.main.url(forResource: "map_style", withExtension: "json")!
            mapView.mapStyle = try GMSMapStyle(contentsOfFileURL: styleUrl)
        } 
        catch {}

        return mapView
    }

    func updateUIView(_ mapView: GMSMapView, context: Context) {
        context.coordinator.parent = self
        mapView.mapType = satellite ? .satellite : .normal
        context.coordinator.tileLayer.outlined = satellite
        if selectedTypeIndex == nil {
            context.coordinator.clearSelectionMarker()
        }
    }

    ////////////////////////////////////////

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, GMSMapViewDelegate, CLLocationManagerDelegate {
        var parent: MapView
        let tileLayer = MapTileLayer()

        init(_ parent: MapView) {
            self.parent = parent
            super.init()
            locationManager.delegate = self
        }

        func configureLocation(for mapView: GMSMapView) {
            self.mapView = mapView
            updateLocationControls()

            if locationManager.authorizationStatus == .notDetermined {
                setBusy(true)
                locationManager.requestWhenInUseAuthorization()
            }
            else if isAuthorized {
                setBusy(true)
                locationManager.requestLocation()
            }
        }

        func mapView(_ mapView: GMSMapView, idleAt position: GMSCameraPosition) {
            SavedCamera.save(position)
        }

        func mapView(_ mapView: GMSMapView, didTapAt coordinate: CLLocationCoordinate2D) {
            select(site: nearestSite(to: coordinate, in: mapView))
        }

        ////////////////////////////////////////
        // CLLocationManagerDelegate

        func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
            updateLocationControls()
            if hasLocated { return }
            if isAuthorized {
                manager.requestLocation()
            }
            else if manager.authorizationStatus != .notDetermined {
                setBusy(false)
            }
        }

        // The first fix centers the map; if there is none, the map keeps the saved camera or the whole world.
        func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
            guard !hasLocated, let location = locations.last else { return }
            hasLocated = true
            setBusy(false)
            mapView?.moveCamera(GMSCameraUpdate.setTarget(location.coordinate, zoom: 16))
        }

        func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
            print("location unavailable: \(error)")
            setBusy(false)
        }


        ////////////////////////////////////////

        private let locationManager = CLLocationManager()
        private var hasLocated = false
        private weak var mapView: GMSMapView?

        // Deferred, since this can be called while SwiftUI is updating the view.
        private func setBusy(_ busy: Bool) {
            DispatchQueue.main.async { [weak self] in
                self?.parent.isBusy = busy
            }
        }

        // The selection is a marker rather than part of the tile layer, so selecting a site
        // doesn't require redrawing tiles.
        private var selectionMarker: GMSMarker?

        // A new marker is created for each selection, because moving an existing one
        // doesn't reliably update its position.
        private func makeSelectionMarker() -> GMSMarker {
            let icon = UIImage(named: "selection_ring")
            let marker = GMSMarker()
            marker.icon = icon
            marker.groundAnchor = CGPoint(x: 0.5, y: 0.5)
            marker.zIndex = 1
            marker.isTappable = false
            return marker
        }
        private var isAuthorized: Bool {
            let status = locationManager.authorizationStatus
            return status == .authorizedWhenInUse || status == .authorizedAlways
        }

        private let SELECTION_RADIUS_POINTS = 20.0

        func clearSelectionMarker() {
            selectionMarker?.map = nil
            selectionMarker = nil
        }

        private func select(site: Site?) {
            clearSelectionMarker()
            if let site, let mapView {
                let marker = makeSelectionMarker()
                let mapLocation = Mercator.unprojectQuantized(site.location)
                marker.position = CLLocationCoordinate2D(latitude: mapLocation.lat, longitude: mapLocation.lon)
                marker.map = mapView
                selectionMarker = marker
            }
            parent.selectedTypeIndex = site.map { Int($0.typeIndex) }
        }

        // Nearest site to the tap, if within SELECTION_RADIUS_POINTS on screen.
        private func nearestSite(to coordinate: CLLocationCoordinate2D, in mapView: GMSMapView) -> Site? {
            let location = MapLocation(lat: coordinate.latitude, lon: coordinate.longitude)

            let projection = mapView.projection
            let tap = projection.point(for: coordinate)

            // Convert the screen-space radius to meters at the tap location.
            let edge = projection.coordinate(for: CGPoint(x: tap.x + SELECTION_RADIUS_POINTS, y: tap.y))
            let radius = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
                .distance(from: CLLocation(latitude: edge.latitude, longitude: edge.longitude))

            return TileDb.instance.findNearest(location: location, maxDistance: radius, zoom: Int(mapView.camera.zoom.rounded()))
        }

        private func updateLocationControls() {
            mapView?.isMyLocationEnabled = isAuthorized
            mapView?.settings.compassButton = isAuthorized
            mapView?.settings.myLocationButton = isAuthorized
        }

    }

}

enum SavedCamera {
    static func save(_ position: GMSCameraPosition) {
        let data = [position.target.latitude, position.target.longitude, Double(position.zoom), position.bearing, position.viewingAngle]
        UserDefaults.standard.set(data, forKey: key)
    }

    static func load() -> GMSCameraPosition? {
        if let data = UserDefaults.standard.array(forKey: key) as? [Double] {
            return GMSCameraPosition(latitude: data[0], longitude: data[1], zoom: Float(data[2]), bearing: data[3], viewingAngle: data[4])
        }
        else {
            return nil
        }
    }

    private static let key = "savedCamera"
}
