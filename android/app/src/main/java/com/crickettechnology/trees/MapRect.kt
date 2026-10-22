package com.crickettechnology.trees

data class MapRect(var northWest: MapLocation, var southEast: MapLocation) {
    init {
        check(northWest.lat >= southEast.lat)
        check(northWest.lon <= southEast.lon)
    }

    constructor(north: Double, west: Double, south: Double, east: Double) :
        this(MapLocation(north, west), MapLocation(south, east))

    val west: Double get() = northWest.lon
    val east: Double get() = southEast.lon
    val minLon: Double get() = west
    val midLon: Double get() = (west + east) / 2
    val maxLon: Double get() = east

    val north: Double get() = northWest.lat
    val south: Double get() = southEast.lat
    val minLat: Double get() = south
    val midLat: Double get() = (north + south) / 2
    val maxLat: Double get() = north

    override fun toString(): String = "[$north, $west, $south, $east]"

    operator fun contains(location: MapLocation): Boolean =
        location.lat >= minLat && location.lat < maxLat &&
            location.lon >= minLon && location.lon < maxLon

    operator fun contains(rect: MapRect): Boolean =
        rect.minLat >= minLat && rect.maxLat <= maxLat &&
            rect.minLon >= minLon && rect.maxLon <= maxLon

    fun intersects(rect: MapRect): Boolean =
        !(maxLat <= rect.minLat || minLat >= rect.maxLat ||
            maxLon <= rect.minLon || minLon >= rect.maxLon)

    companion object {
        val global: MapRect get() = MapRect(north = 90.0, west = 0.0, south = -90.0, east = 180.0)
    }
}
