import SwiftUI
import GoogleMaps
import CoreLocation

struct MapView: UIViewRepresentable {

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

        self.tileLayer.map = mapView

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
        context.coordinator.configureSelectionLabel(for: mapView)

        // custom map style
        do 
        {
            let styleUrl = Bundle.main.url(forResource: "map_style", withExtension: "json")!
            mapView.mapStyle = try GMSMapStyle(contentsOfFileURL: styleUrl)
        } 
        catch {}

        return mapView
    }

    func updateUIView(_ mapView: GMSMapView, context: Context) {}

    let tileLayer = MapTileLayer()

    ////////////////////////////////////////

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, GMSMapViewDelegate, CLLocationManagerDelegate {
        var parent: MapView
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
                locationManager.requestWhenInUseAuthorization()
            }
            else {
                locationManager.requestLocation()
            }
        }

        func configureSelectionLabel(for mapView: GMSMapView) {
            let label = selectionLabel
            label.isHidden = true
            label.font = .italicSystemFont(ofSize: 16)
            label.textAlignment = .center
            label.numberOfLines = 0
            label.textColor = .white
            label.backgroundColor = UIColor.black.withAlphaComponent(0.7)
            label.layer.cornerRadius = 8
            label.layer.masksToBounds = true
            label.translatesAutoresizingMaskIntoConstraints = false
            mapView.addSubview(label)
            NSLayoutConstraint.activate([
                label.topAnchor.constraint(equalTo: mapView.safeAreaLayoutGuide.topAnchor, constant: 8),
                label.centerXAnchor.constraint(equalTo: mapView.centerXAnchor),
                label.widthAnchor.constraint(lessThanOrEqualTo: mapView.widthAnchor, constant: -32),
            ])
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
            if !hasCenteredOnLocation && isAuthorized {
                manager.requestLocation()
            }
        }

        // The first fix centers the map; if there is none, the map keeps showing all the data.
        func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
            guard !hasCenteredOnLocation, let location = locations.last else { return }
            hasCenteredOnLocation = true
            mapView?.moveCamera(GMSCameraUpdate.setTarget(location.coordinate, zoom: 16))
        }

        func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
            print("location unavailable: \(error)")
        }


        ////////////////////////////////////////

        var hasCenteredOnLocation = false

        // The selection is a marker rather than part of the tile layer, so selecting a site
        // doesn't require redrawing tiles.
        private var selectionMarker: GMSMarker?

        // A new marker is created for each selection, because moving an existing one
        // doesn't reliably update its position.
        private func makeSelectionMarker() -> GMSMarker {
            let size: CGFloat = 12
            let icon = UIGraphicsImageRenderer(size: CGSize(width: size, height: size)).image { context in
                UIColor.yellow.setFill()
                UIColor.black.setStroke()
                let rect = CGRect(x: 1, y: 1, width: size - 2, height: size - 2)
                context.cgContext.fillEllipse(in: rect)
                context.cgContext.strokeEllipse(in: rect)
            }
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

        private let selectionLabel = PaddedLabel()
        private let SELECTION_RADIUS_POINTS = 20.0

        private func select(site: QuantizedSite?) {
            selectionMarker?.map = nil
            selectionMarker = nil
            if let site, let mapView {
                let location = site.location
                let marker = makeSelectionMarker()
                marker.position = CLLocationCoordinate2D(latitude: location.lat, longitude: location.lon)
                marker.map = mapView
                selectionMarker = marker
            }
            selectionLabel.text = site?.type.canonicalName
            selectionLabel.isHidden = site == nil
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

final class PaddedLabel: UILabel {
    private let insets = UIEdgeInsets(top: 6, left: 12, bottom: 6, right: 12)

    override func drawText(in rect: CGRect) {
        super.drawText(in: rect.inset(by: insets))
    }

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: size.width + insets.left + insets.right,
                      height: size.height + insets.top + insets.bottom)
    }
}
