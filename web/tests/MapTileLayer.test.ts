import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tileGeometry, wrappedRegions } from '../src/MapTileLayer';
import { Mercator } from '../src/Mercator';

test('zoomed-out dots and satellite borders match native point sizes', () => {
    const normal = tileGeometry(1, 1, 2, false);
    const satellite = tileGeometry(1, 1, 2, true);
    assert.equal(normal.radius, 1.5);
    assert.equal(normal.outerRadius, normal.radius);
    assert.equal(satellite.radius, normal.radius);
    assert.equal(satellite.outerRadius, normal.radius + 2 / 3);
    assert.ok(satellite.region.minX < normal.region.minX);
    assert.ok(satellite.region.maxY > normal.region.maxY);
});

test('zoomed-in diameter represents four meters at the tile center', () => {
    const zoom = 22;
    const count = 2 ** zoom;
    const y = Math.floor(Mercator.project({ lat: 34.05, lon: -118.25 }).y * count);
    const geometry = tileGeometry(0, y, zoom, false);
    const center = Mercator.unproject({ x: 0.5 / count, y: (y + 0.5) / count });
    const metersPerPoint = Mercator.metersPerUnit(center.lat) / (count * 256);
    assert.ok(Math.abs(geometry.radius * 2 * metersPerPoint - 4) < 1e-10);
    assert.ok(geometry.radius > 1.5);
});

test('tile query padding includes exactly the outer circle radius', () => {
    const { tileCount, outerRadius, region } = tileGeometry(10, 12, 5, true);
    assert.ok(Math.abs((10 / tileCount - region.minX) * tileCount * 256 - outerRadius) < 1e-10);
    assert.ok(Math.abs((region.maxX - 11 / tileCount) * tileCount * 256 - outerRadius) < 1e-10);
});

test('antimeridian neighbors are queried on both sides and polar bounds stay in the world', () => {
    const west = tileGeometry(0, 0, 3, false);
    const westRegions = wrappedRegions(west.region);
    assert.equal(westRegions.length, 2);
    assert.equal(westRegions[0].minX, 0);
    assert.equal(westRegions[1].maxX, 1);
    assert.equal(westRegions[0].minY, 0);
    const east = tileGeometry(7, 7, 3, false);
    const eastRegions = wrappedRegions(east.region);
    assert.equal(eastRegions.length, 2);
    assert.equal(eastRegions[0].maxX, 1);
    assert.equal(eastRegions[1].minX, 0);
    assert.equal(eastRegions[0].maxY, 1);
    assert.equal(wrappedRegions(tileGeometry(3, 3, 3, false).region).length, 1);
    assert.equal(wrappedRegions(tileGeometry(0, 0, 0, false).region).length, 3);
});
