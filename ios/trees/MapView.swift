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
            context.coordinator.hasCenteredOnLocation = true
        }
        else {
            mapView.moveCamera(GMSCameraUpdate.fit(MapDb.instance.dataBounds, withPadding: 20))
        }
        mapView.delegate = context.coordinator

        // the layer is kept by the coordinator, since this struct is recreated on every SwiftUI update
        let tileLayer = context.coordinator.tileLayer
        tileLayer.map = mapView
        MapDb.instance.onTilesDownloaded = { [weak tileLayer] in
            tileLayer?.clearTileCache()
        }

        /*
        for tree in Site.all.prefix(100) {
            let marker = GMSMarker(
                position: CLLocationCoordinate2D(
                    latitude: tree.latitude,
                    longitude: tree.longitude
                )
            )
            marker.title = tree.type.canonicalName
            marker.map = mapView
        }
        */

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
        private let locationManager = CLLocationManager()
        private weak var mapView: GMSMapView?

        init(_ parent: MapView) {
            self.parent = parent
            super.init()
            locationManager.delegate = self
        }

        func configureLocation(for mapView: GMSMapView) {
            self.mapView = mapView
            updateLocationControls()

            if locationManager.authorizationStatus == .notDetermined {
                if !hasCenteredOnLocation { showSpinner(in: mapView) }
                locationManager.requestWhenInUseAuthorization()
            }
            else if !hasCenteredOnLocation && isAuthorized {
                showSpinner(in: mapView)
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
            if hasCenteredOnLocation { return }
            if isAuthorized {
                manager.requestLocation()
            }
            else if manager.authorizationStatus != .notDetermined {
                hideSpinner()
            }
        }

        // The first fix centers the map; if there is none, the map keeps showing all the data.
        func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
            guard !hasCenteredOnLocation, let location = locations.last else { return }
            hasCenteredOnLocation = true
            hideSpinner()
            mapView?.moveCamera(GMSCameraUpdate.setTarget(location.coordinate, zoom: 16))
        }

        func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
            print("location unavailable: \(error)")
            hideSpinner()
        }


        ////////////////////////////////////////

        var hasCenteredOnLocation = false

        // A modal overlay (it blocks touches) shown while the initial location is pending.
        private let SPINNER_TIMEOUT_SECONDS = 10.0

        private func showSpinner(in mapView: GMSMapView) {
            setBusy(true)
            DispatchQueue.main.asyncAfter(deadline: .now() + SPINNER_TIMEOUT_SECONDS) { [weak self] in
                self?.hideSpinner()
            }
        }

        private func hideSpinner() {
            setBusy(false)
        }

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
            // vector asset, so it can be edited in Assets.xcassets
            let icon = UIImage(named: "selection_ring")
            let marker = GMSMarker()
            marker.icon = icon
            marker.groundAnchor = CGPoint(x: 0.5, y: 0.5)
            marker.zIndex = 1
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

        private func select(site: QuantizedSite?) {
            clearSelectionMarker()
            if let site, let mapView {
                let location = site.location
                let marker = makeSelectionMarker()
                marker.position = CLLocationCoordinate2D(latitude: location.lat, longitude: location.lon)
                marker.map = mapView
                selectionMarker = marker
            }
            parent.selectedTypeIndex = site.map { Int($0.typeIndex) }
        }

        // Nearest site to the tap, if within SELECTION_RADIUS_POINTS on screen.
        private func nearestSite(to coordinate: CLLocationCoordinate2D, in mapView: GMSMapView) -> QuantizedSite? {
            let projection = mapView.projection
            let tap = projection.point(for: coordinate)

            // Convert the screen-space radius to meters at the tap location.
            let edge = projection.coordinate(for: CGPoint(x: tap.x + SELECTION_RADIUS_POINTS, y: tap.y))
            let radius = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
                .distance(from: CLLocation(latitude: edge.latitude, longitude: edge.longitude))

            return MapDb.instance.findNearest(
                location: MapLocation(lat: coordinate.latitude, lon: coordinate.longitude),
                maxDistance: radius,
                zoom: Int(mapView.camera.zoom.rounded()))
        }

        private func updateLocationControls() {
            mapView?.isMyLocationEnabled = isAuthorized
            mapView?.settings.compassButton = isAuthorized
            mapView?.settings.myLocationButton = isAuthorized
        }

    }

}

enum SavedCamera {
    private static let key = "savedCamera"

    static func save(_ position: GMSCameraPosition) {
        UserDefaults.standard.set([position.target.latitude, position.target.longitude,
                                   Double(position.zoom), position.bearing, position.viewingAngle],
                                  forKey: key)
    }

    static func load() -> GMSCameraPosition? {
        guard let v = UserDefaults.standard.array(forKey: key) as? [Double], v.count == 5,
              abs(v[0]) <= 90, abs(v[1]) <= 180 else { return nil }
        return GMSCameraPosition(latitude: v[0], longitude: v[1], zoom: Float(v[2]),
                                 bearing: v[3], viewingAngle: v[4])
    }
}
