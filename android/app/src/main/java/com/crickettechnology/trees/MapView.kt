package com.crickettechnology.trees

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Rect
import android.graphics.Point
import android.location.Location
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.toBitmap
import androidx.core.view.doOnLayout
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import kotlin.math.roundToInt
import com.google.android.gms.maps.MapView as GoogleMapView

class MapView(

    // Type index of the selected site, shown by the selection card in ContentView.
    val selectedTypeIndex: MutableState<Int?>,

    // True while waiting for the device location; shown by BusyView in ContentView.
    val isBusy: MutableState<Boolean>,

    // True after a tile download failed, until one succeeds; shown as a banner in ContentView.
    val tileDownloadFailed: MutableState<Boolean>,

    // Satellite imagery instead of the normal map.
    val satellite: Boolean,

    // Whether the custom location button is available, and requests to recenter the map.
    val isLocationAuthorized: MutableState<Boolean>,
    val locationRequest: Int
) {

    // Android-specific: hosts the map in Compose, as UIViewRepresentable does in SwiftUI.
    @Composable
    fun Content() {
        val context = LocalContext.current
        val coordinator = remember { makeCoordinator() }
        coordinator.parent = this

        val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
            coordinator.locationPermissionChanged()
        }
        coordinator.requestLocationPermission = {
            permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }

        val mapView = remember { makeUIView(context, coordinator) }

        // Android-specific: keep the map's controls clear of the system bars, as iOS does automatically
        val insets = WindowInsets.safeDrawing
        val density = LocalDensity.current
        val layoutDirection = LocalLayoutDirection.current
        coordinator.padding = Rect(
            insets.getLeft(density, layoutDirection),
            insets.getTop(density),
            insets.getRight(density, layoutDirection),
            insets.getBottom(density))

        // the map view must be told about lifecycle events
        val lifecycle = LocalLifecycleOwner.current.lifecycle
        DisposableEffect(lifecycle) {
            val observer = LifecycleEventObserver { _, event ->
                when (event) {
                    Lifecycle.Event.ON_START -> mapView.onStart()
                    Lifecycle.Event.ON_RESUME -> mapView.onResume()
                    Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                    Lifecycle.Event.ON_STOP -> mapView.onStop()
                    else -> {}
                }
            }
            lifecycle.addObserver(observer)
            onDispose {
                lifecycle.removeObserver(observer)
                mapView.onDestroy()
            }
        }

        AndroidView(factory = { mapView }, modifier = Modifier.fillMaxSize()) {
            updateUIView(coordinator)
        }
    }

    ////////////////////////////////////////

    private fun makeUIView(context: Context, coordinator: Coordinator): GoogleMapView {
        val mapView = GoogleMapView(context)
        mapView.onCreate(null)

        // Android-specific: the map is provided asynchronously
        mapView.getMapAsync { map ->
            val saved = SavedCamera.load()
            if (saved != null) {
                map.moveCamera(CameraUpdateFactory.newCameraPosition(saved))
            }
            else {
                // LatLng normalizes a longitude of 180 to -180, so stop just short of it
                val southWest = LatLng(-85.0, -179.999)
                val northEast = LatLng(85.0, 179.999)
                val bounds = LatLngBounds(southWest, northEast)
                // fitting bounds needs the view's size
                mapView.doOnLayout { map.moveCamera(CameraUpdateFactory.newLatLngBounds(bounds, 0)) }
            }
            map.setOnCameraIdleListener(coordinator)
            map.setOnMapClickListener(coordinator)
            // the selection marker should not be tappable; consuming the tap is the closest Android equivalent
            map.setOnMarkerClickListener { true }

            val tileLayer = coordinator.tileLayer
            tileLayer.map = map

            // when a tile downloads, clear cache to show it
            TileDb.instance.onTilesDownloaded = {
                tileLayer.clearTileCache()
            }
            TileDb.instance.onDownloadFailedChanged = { failed ->
                coordinator.parent.tileDownloadFailed.value = failed
            }

            coordinator.configureLocation(map)

            // custom map style
            val style = context.assets.open("map_style.json").use { it.readBytes() }
            map.setMapStyle(MapStyleOptions(String(style)))

            // the map wasn't available when the view was first updated
            coordinator.parent.updateUIView(coordinator)
        }

        return mapView
    }

    private fun updateUIView(coordinator: Coordinator) {
        coordinator.parent = this
        val map = coordinator.map
        if (map != null) {
            map.mapType = if (satellite) GoogleMap.MAP_TYPE_SATELLITE else GoogleMap.MAP_TYPE_NORMAL
            val padding = coordinator.padding
            map.setPadding(padding.left, padding.top, padding.right, padding.bottom)
        }
        coordinator.tileLayer.outlined = satellite
        if (selectedTypeIndex.value == null) {
            coordinator.clearSelectionMarker()
        }
        if (map != null && coordinator.lastLocationRequest != locationRequest) {
            coordinator.lastLocationRequest = locationRequest
            coordinator.showMyLocation()
        }
    }

    ////////////////////////////////////////

    private fun makeCoordinator(): Coordinator {
        return Coordinator(this)
    }

    class Coordinator(var parent: MapView) : GoogleMap.OnCameraIdleListener, GoogleMap.OnMapClickListener {
        val tileLayer = MapTileLayer()
        var lastLocationRequest = 0

        // Android-specific: shows the system's location permission request; set by MapView.
        var requestLocationPermission: (() -> Unit)? = null

        var map: GoogleMap? = null
            private set

        // Android-specific: the system bar insets, in pixels
        var padding = Rect()

        fun configureLocation(map: GoogleMap) {
            this.map = map
            updateLocationControls()

            // Android can't tell whether permission was never requested or was denied; if the user
            // denied it permanently, the request returns immediately.
            if (!isAuthorized) {
                setBusy(true)
                requestLocationPermission!!()
            }
            else {
                setBusy(true)
                requestLocation()
            }
        }

        override fun onCameraIdle() {
            SavedCamera.save(map!!.cameraPosition)
        }

        override fun onMapClick(latLng: LatLng) {
            select(nearestSite(latLng, map!!))
        }

        fun showMyLocation() {
            if (isAuthorized) {
                isRecentering = true
                setBusy(true)
                requestLocation()
            }
        }

        ////////////////////////////////////////
        // location (CLLocationManagerDelegate on iOS)

        fun locationPermissionChanged() {
            updateLocationControls()
            if (hasLocated) { return }
            if (isAuthorized) {
                requestLocation()
            }
            else {
                setBusy(false)
            }
        }

        // The first fix centers the map; if there is none, the map keeps the saved camera or the whole world.
        fun locationUpdated(location: Location) {
            if (hasLocated && !isRecentering) { return }
            hasLocated = true
            setBusy(false)
            if (isRecentering) {
                map?.animateCamera(CameraUpdateFactory.newLatLng(LatLng(location.latitude, location.longitude)))
            }
            else {
                map?.moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(location.latitude, location.longitude), 16f))
            }
            isRecentering = false
        }

        fun locationFailed(error: Exception?) {
            println("location unavailable: $error")
            isRecentering = false
            setBusy(false)
        }


        ////////////////////////////////////////

        private val locationClient = LocationServices.getFusedLocationProviderClient(TreesApplication.context)
        private var hasLocated = false
        private var isRecentering = false

        private fun setBusy(busy: Boolean) {
            parent.isBusy.value = busy
        }

        // Android-specific: counterpart of CLLocationManager.requestLocation
        @SuppressLint("MissingPermission")
        private fun requestLocation() {
            locationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                .addOnSuccessListener { location ->
                    if (location != null) {
                        locationUpdated(location)
                    }
                    else {
                        locationFailed(null)
                    }
                }
                .addOnFailureListener { error -> locationFailed(error) }
        }

        // The selection is a marker rather than part of the tile layer, so selecting a site
        // doesn't require redrawing tiles.
        private var selectionMarker: Marker? = null

        // Android-specific: markers need a bitmap, so the vector drawable is rasterized once.
        private val selectionRingIcon: BitmapDescriptor by lazy {
            val drawable = ContextCompat.getDrawable(TreesApplication.context, R.drawable.selection_ring)!!
            BitmapDescriptorFactory.fromBitmap(drawable.toBitmap())
        }

        // A new marker is created for each selection, as on iOS.
        private fun makeSelectionMarker(position: LatLng): MarkerOptions {
            val icon = selectionRingIcon
            val marker = MarkerOptions()
            marker.icon(icon)
            marker.anchor(0.5f, 0.5f)
            marker.zIndex(1f)
            marker.position(position)
            return marker
        }
        private val isAuthorized: Boolean
            get() {
                val context = TreesApplication.context
                return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                       ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            }

        private val SELECTION_RADIUS_POINTS = 20.0

        fun clearSelectionMarker() {
            selectionMarker?.remove()
            selectionMarker = null
        }

        private fun select(site: Site?) {
            clearSelectionMarker()
            val map = this.map
            if (site != null && map != null) {
                val mapLocation = Mercator.unprojectQuantized(site.location)
                val marker = makeSelectionMarker(LatLng(mapLocation.lat, mapLocation.lon))
                selectionMarker = map.addMarker(marker)
            }
            parent.selectedTypeIndex.value = site?.typeIndex
        }

        // Nearest site to the tap, if within SELECTION_RADIUS_POINTS on screen.
        private fun nearestSite(coordinate: LatLng, map: GoogleMap): Site? {
            val location = MapLocation(coordinate.latitude, coordinate.longitude)

            val projection = map.projection
            val tap = projection.toScreenLocation(coordinate)

            // Convert the screen-space radius to meters at the tap location.
            val radiusPixels = SELECTION_RADIUS_POINTS * TreesApplication.context.resources.displayMetrics.density
            val edge = projection.fromScreenLocation(Point(tap.x + radiusPixels.roundToInt(), tap.y))
            val distance = FloatArray(1)
            Location.distanceBetween(coordinate.latitude, coordinate.longitude, edge.latitude, edge.longitude, distance)
            val radius = distance[0].toDouble()

            return TileDb.instance.findNearest(location, radius, map.cameraPosition.zoom.roundToInt())
        }

        @SuppressLint("MissingPermission")
        private fun updateLocationControls() {
            val map = this.map
            if (map != null) {
                map.isMyLocationEnabled = isAuthorized
                map.uiSettings.isCompassEnabled = isAuthorized
                map.uiSettings.isMyLocationButtonEnabled = false
            }
            parent.isLocationAuthorized.value = isAuthorized
        }

    }

}

object SavedCamera {
    fun save(position: CameraPosition) {
        val data = listOf(position.target.latitude, position.target.longitude, position.zoom.toDouble(), position.bearing.toDouble(), position.tilt.toDouble())
        TreesApplication.defaults.edit().putString(key, data.joinToString(",")).apply()
    }

    fun load(): CameraPosition? {
        val string = TreesApplication.defaults.getString(key, null)
        if (string != null) {
            val data = string.split(",").map { it.toDouble() }
            return CameraPosition(LatLng(data[0], data[1]), data[2].toFloat(), data[4].toFloat(), data[3].toFloat())
        }
        else {
            return null
        }
    }

    private const val key = "savedCamera"
}
