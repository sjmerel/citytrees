import SwiftUI
import GoogleMaps
import CoreLocation

struct MapView: UIViewRepresentable {

    var coordinate: CLLocationCoordinate2D
    var zoom: Float

    ////////////////////////////////////////

    func makeUIView(context: Context) -> GMSMapView {
        let camera = GMSCameraPosition(
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            zoom: zoom
        )
        let mapView = GMSMapView()
        mapView.camera = camera
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

    func updateUIView(_ mapView: GMSMapView, context: Context) {
        // Animate camera to new target if coordinate/zoom changes
        let camera = GMSCameraPosition(
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            zoom: zoom
        )
        mapView.animate(to: camera)
    }

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

        func mapView(_ mapView: GMSMapView, didTapAt coordinate: CLLocationCoordinate2D) {
            select(site: nearestSite(to: coordinate, in: mapView))
        }

        /*
        func mapView(_ mapView: GMSMapView, didTap marker: GMSMarker) -> Bool {
            print("Tapped marker: \(marker.title ?? "Untitled")")
            return false // Return false to allow default behavior (shows info window and centers)
        }

        func mapView(_ mapView: GMSMapView, idleAt position: GMSCameraPosition) {
            // Called when camera stops moving
        }
        */

        ////////////////////////////////////////
        // CLLocationManagerDelegate

        func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
            updateLocationControls()
        }


        ////////////////////////////////////////

        private let selectionLabel = PaddedLabel()
        private let SELECTION_RADIUS_POINTS = 20.0

        private func select(site: TreeSite?) {
            parent.tileLayer.selectedSite = site
            selectionLabel.text = site?.type.canonicalName
            selectionLabel.isHidden = site == nil
        }

        // Nearest site to the tap, if within SELECTION_RADIUS_POINTS on screen.
        private func nearestSite(to coordinate: CLLocationCoordinate2D, in mapView: GMSMapView) -> TreeSite? {
            let projection = mapView.projection
            let tap = projection.point(for: coordinate)
            let r = SELECTION_RADIUS_POINTS

            // Bounding box of the search circle; the map may be rotated, so use all four corners.
            let corners = [(-r, -r), (r, -r), (-r, r), (r, r)].map {
                projection.coordinate(for: CGPoint(x: tap.x + $0.0, y: tap.y + $0.1))
            }
            let north = corners.map(\.latitude).max()!
            let south = corners.map(\.latitude).min()!
            let west = corners.map(\.longitude).min()!
            let east = corners.map(\.longitude).max()!
            let rect = MapRect(north: north, west: west, south: south, east: east)

            var best: TreeSite?
            var bestDistance = r * r
            for site in TreeNode.all.find(rect: rect) {
                let p = projection.point(for: CLLocationCoordinate2D(latitude: site.location.lat,
                                                                     longitude: site.location.lon))
                let d = (p.x - tap.x) * (p.x - tap.x) + (p.y - tap.y) * (p.y - tap.y)
                if d <= bestDistance {
                    bestDistance = d
                    best = site
                }
            }
            return best
        }

        private func updateLocationControls() {
            let status = locationManager.authorizationStatus
            let isAuthorized = status == .authorizedWhenInUse || status == .authorizedAlways
            mapView?.isMyLocationEnabled = isAuthorized
            mapView?.settings.compassButton = isAuthorized
            mapView?.settings.myLocationButton = isAuthorized
        }

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
