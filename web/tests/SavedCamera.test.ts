import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCamera } from '../src/SavedCamera';

test('saved camera restores valid locations and rejects malformed browser state', () => {
    assert.deepEqual(parseCamera('{"lat":34.05,"lng":-118.25,"zoom":17.5}'), { lat: 34.05, lng: -118.25, zoom: 17.5 });
    for (const value of [
        'null', '[]', '{}', 'invalid', '{"lat":"34","lng":0,"zoom":2}',
        '{"lat":90,"lng":0,"zoom":2}', '{"lat":0,"lng":200,"zoom":2}',
        '{"lat":0,"lng":0,"zoom":-1}', '{"lat":0,"lng":0,"zoom":1e999}',
    ]) {
        assert.throws(() => parseCamera(value), value);
    }
});
