import axios from 'axios';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export async function readPointShapefile(
  url: string,
  filePrefix: string,
  visit: (attributes: Record<string, string>, x: number, y: number) => void
): Promise<{ sourceCount: number; projection: string }> {
  let response = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 });
  let id = `${filePrefix}-${randomUUID()}`;
  let archivePath = path.join(__dirname, `.${id}.zip`);
  let extractedPaths: string[] = [];
  try {
    fs.writeFileSync(archivePath, response.data);
    let members = execFileSync('unzip', ['-Z1', archivePath], { encoding: 'utf8' })
      .split(/\r?\n/).filter(Boolean);
    let member = (extension: string) => {
      let matches = members.filter(name => path.extname(name).toLowerCase() === extension);
      assert.equal(matches.length, 1, `Expected one ${extension} in ${filePrefix} archive`);
      return matches[0];
    };
    let shpPath = path.join(__dirname, `.${id}.shp`);
    let dbfPath = path.join(__dirname, `.${id}.dbf`);
    let prjPath = path.join(__dirname, `.${id}.prj`);
    extractedPaths.push(shpPath, dbfPath, prjPath);
    for (let [archiveMember, outputPath] of [
      [member('.shp'), shpPath], [member('.dbf'), dbfPath], [member('.prj'), prjPath]
    ]) {
      let fd = fs.openSync(outputPath, 'w');
      try {
        execFileSync('unzip', ['-p', archivePath, archiveMember], {
          stdio: ['ignore', fd, 'inherit']
        });
      } finally {
        fs.closeSync(fd);
      }
    }

    let projection = fs.readFileSync(prjPath, 'utf8');
    assert(/GCS_WGS_1984|GCS_GDA_1994/.test(projection), `Unexpected CRS in ${filePrefix}`);
    let shapes = fs.readFileSync(shpPath);
    assert.equal(shapes.readInt32BE(24) * 2, shapes.length, 'Invalid shapefile length');
    assert.equal(shapes.readInt32LE(32), 1, 'Expected a point shapefile');

    let dbfFd = fs.openSync(dbfPath, 'r');
    try {
      let header = Buffer.alloc(32);
      assert.equal(fs.readSync(dbfFd, header, 0, header.length, 0), header.length);
      let sourceCount = header.readUInt32LE(4);
      let headerLength = header.readUInt16LE(8);
      let recordLength = header.readUInt16LE(10);
      assert(sourceCount > 0 && recordLength > 1 && headerLength >= 33);
      let descriptorBytes = Buffer.alloc(headerLength - 32);
      assert.equal(fs.readSync(dbfFd, descriptorBytes, 0, descriptorBytes.length, 32), descriptorBytes.length);
      let fields: { name: string; offset: number; length: number }[] = [];
      let offset = 1;
      for (let position = 0; descriptorBytes[position] !== 13; position += 32) {
        assert(position + 32 <= descriptorBytes.length, 'Invalid DBF field descriptors');
        let descriptor = descriptorBytes.subarray(position, position + 32);
        let name = descriptor.subarray(0, 11).toString('ascii').replace(/\0.*$/, '');
        let length = descriptor[16];
        assert(name && length > 0);
        fields.push({ name, offset, length });
        offset += length;
      }
      assert.equal(offset, recordLength, 'DBF record length does not match its fields');

      let pointOffset = 100;
      let record = Buffer.alloc(recordLength);
      for (let index = 0; index < sourceCount; index++) {
        assert(pointOffset + 28 <= shapes.length, 'Missing shapefile point');
        assert.equal(shapes.readInt32BE(pointOffset), index + 1, 'Invalid shapefile record sequence');
        let contentLength = shapes.readInt32BE(pointOffset + 4) * 2;
        assert.equal(contentLength, 20, 'Unexpected point record size');
        assert.equal(shapes.readInt32LE(pointOffset + 8), 1, 'Unexpected geometry type');
        let x = shapes.readDoubleLE(pointOffset + 12);
        let y = shapes.readDoubleLE(pointOffset + 20);
        pointOffset += 8 + contentLength;
        assert.equal(fs.readSync(dbfFd, record, 0, record.length, headerLength + index * recordLength), record.length);
        if (record[0] === 42) continue;
        let attributes: Record<string, string> = {};
        for (let field of fields) {
          attributes[field.name] = record.subarray(field.offset, field.offset + field.length)
            .toString('latin1').replace(/\0/g, '').trim();
        }
        visit(attributes, x, y);
      }
      assert.equal(pointOffset, shapes.length, 'Unexpected trailing shapefile data');
      return { sourceCount, projection };
    } finally {
      fs.closeSync(dbfFd);
    }
  } finally {
    for (let file of [archivePath, ...extractedPaths]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
}
