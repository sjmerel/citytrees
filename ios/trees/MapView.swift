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
                if !hasCenteredOnLocation { showSpinner(in: mapView) }
                locationManager.requestWhenInUseAuthorization()
            }
            else if !hasCenteredOnLocation && isAuthorized {
                showSpinner(in: mapView)
                locationManager.requestLocation()
            }
        }

        func configureSelectionLabel(for mapView: GMSMapView) {
            let card = selectionCard
            card.isHidden = true
            card.backgroundColor = .white
            card.layer.cornerRadius = 10
            card.layer.shadowColor = UIColor.black.cgColor
            card.layer.shadowOpacity = 0.3
            card.layer.shadowRadius = 5
            card.layer.shadowOffset = CGSize(width: 0, height: 2)
            card.translatesAutoresizingMaskIntoConstraints = false

            let dot = selectionDot
            dot.layer.cornerRadius = 8
            dot.layer.borderWidth = 1
            dot.layer.borderColor = UIColor.black.withAlphaComponent(0.4).cgColor
            dot.translatesAutoresizingMaskIntoConstraints = false

            let label = selectionLabel
            label.font = .italicSystemFont(ofSize: 16)
            label.textAlignment = .left
            label.numberOfLines = 0
            label.textColor = .black
            label.translatesAutoresizingMaskIntoConstraints = false

            card.addSubview(dot)
            card.addSubview(label)
            mapView.addSubview(card)
            NSLayoutConstraint.activate([
                card.topAnchor.constraint(equalTo: mapView.safeAreaLayoutGuide.topAnchor, constant: 5),
                card.leadingAnchor.constraint(equalTo: mapView.leadingAnchor, constant: 5),
                card.trailingAnchor.constraint(equalTo: mapView.trailingAnchor, constant: -5),

                dot.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
                dot.centerYAnchor.constraint(equalTo: card.centerYAnchor),
                dot.widthAnchor.constraint(equalToConstant: 16),
                dot.heightAnchor.constraint(equalToConstant: 16),

                label.leadingAnchor.constraint(equalTo: dot.trailingAnchor, constant: 10),
                label.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
                label.topAnchor.constraint(equalTo: card.topAnchor, constant: 10),
                label.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -10),
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
        private var spinnerOverlay: UIView?
        private let SPINNER_TIMEOUT_SECONDS = 10.0

        private func showSpinner(in mapView: GMSMapView) {
            let overlay = UIView(frame: mapView.bounds)
            overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            overlay.backgroundColor = UIColor.black.withAlphaComponent(0.3)
            let spinner = UIActivityIndicatorView(style: .large)
            spinner.color = .white
            spinner.center = CGPoint(x: overlay.bounds.midX, y: overlay.bounds.midY)
            spinner.autoresizingMask = [.flexibleTopMargin, .flexibleBottomMargin,
                                        .flexibleLeftMargin, .flexibleRightMargin]
            spinner.startAnimating()
            overlay.addSubview(spinner)
            mapView.addSubview(overlay)
            spinnerOverlay = overlay

            DispatchQueue.main.asyncAfter(deadline: .now() + SPINNER_TIMEOUT_SECONDS) { [weak self] in
                self?.hideSpinner()
            }
        }

        private func hideSpinner() {
            spinnerOverlay?.removeFromSuperview()
            spinnerOverlay = nil
        }

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

        private let selectionCard = UIView()
        private let selectionDot = UIView()
        private let selectionLabel = UILabel()
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
            if let site {
                selectionDot.backgroundColor = TreeType.palette[Int(TreeType.colorIndices[Int(site.typeIndex)])]
            }
            selectionCard.isHidden = site == nil
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
