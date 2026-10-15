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

    private let tileLayer = MapTileLayer()

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

        private func updateLocationControls() {
            let status = locationManager.authorizationStatus
            let isAuthorized = status == .authorizedWhenInUse || status == .authorizedAlways
            mapView?.isMyLocationEnabled = isAuthorized
            mapView?.settings.compassButton = isAuthorized
            mapView?.settings.myLocationButton = isAuthorized
        }

    }

}
