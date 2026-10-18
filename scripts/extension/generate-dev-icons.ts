import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '../..');

// CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i] ?? 0;
    const tableIndex = (crc ^ byte) & 0xff;
    const tableVal = crcTable[tableIndex] ?? 0;
    crc = tableVal ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

export function convertIconToOrange(
  inputPath: string,
  outputPath: string,
  targetR = 249, // #f97316
  targetG = 115,
  targetB = 22,
): void {
  const buf = readFileSync(inputPath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);

  let pos = 8;
  const idatParts: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    if (type === 'IDAT') {
      idatParts.push(buf.slice(pos + 8, pos + 8 + len));
    }
    pos += 8 + len + 4;
  }

  const decompressed = inflateSync(Buffer.concat(idatParts));
  const stride = 1 + width * 4;
  const uncompressed = Buffer.alloc(width * height * 4);

  // Unfilter PNG scanlines (RGBA 8-bit)
  for (let y = 0; y < height; y++) {
    const filter = decompressed[y * stride] ?? 0;
    const rawScanline = decompressed.slice(y * stride + 1, (y + 1) * stride);
    const prevScanline =
      y > 0 ? uncompressed.slice((y - 1) * width * 4, y * width * 4) : null;
    const currentScanline = uncompressed.slice(
      y * width * 4,
      (y + 1) * width * 4,
    );

    for (let x = 0; x < width * 4; x++) {
      const b = prevScanline ? (prevScanline[x] ?? 0) : 0;
      const a = x >= 4 ? (currentScanline[x - 4] ?? 0) : 0;
      const c = prevScanline && x >= 4 ? (prevScanline[x - 4] ?? 0) : 0;

      let val = rawScanline[x] ?? 0;
      if (filter === 1) {
        val = (val + a) & 0xff;
      } else if (filter === 2) {
        val = (val + b) & 0xff;
      } else if (filter === 3) {
        val = (val + Math.floor((a + b) / 2)) & 0xff;
      } else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = a;
        if (pb < pa && pb < pc) {
          pr = b;
        } else if (pc < pa) {
          pr = c;
        }
        val = (val + pr) & 0xff;
      }
      currentScanline[x] = val;
    }
  }

  // Convert cyan hue to vibrant orange while preserving transparency and antialiased intensity
  // Base cyan maximum channel is ~212 (#00b4d4)
  const baseIntensity = 212;
  for (let i = 0; i < uncompressed.length; i += 4) {
    const g = uncompressed[i + 1] ?? 0;
    const b = uncompressed[i + 2] ?? 0;
    const alpha = uncompressed[i + 3] ?? 0;

    if (alpha > 0) {
      const intensity = Math.max(g, b) / baseIntensity;
      uncompressed[i] = Math.min(255, Math.round(targetR * intensity));
      uncompressed[i + 1] = Math.min(255, Math.round(targetG * intensity));
      uncompressed[i + 2] = Math.min(255, Math.round(targetB * intensity));
    }
  }

  // Re-encode to PNG scanlines with filter 0 (None)
  const scanlinesWithFilter = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    scanlinesWithFilter[y * stride] = 0;
    uncompressed.copy(
      scanlinesWithFilter,
      y * stride + 1,
      y * width * 4,
      (y + 1) * width * 4,
    );
  }

  const compressed = deflateSync(scanlinesWithFilter);

  // PNG header + chunks
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  const outBuf = Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, outBuf);
}

function main() {
  const sizes = [16, 32, 48, 128];
  const iconsDir = resolve(ROOT_DIR, 'extension/public/icons');
  const devIconsDir = resolve(iconsDir, 'dev');

  for (const size of sizes) {
    const inputPath = resolve(iconsDir, `icon-${size}.png`);
    const outputPath = resolve(devIconsDir, `icon-${size}.png`);
    convertIconToOrange(inputPath, outputPath);
    console.log(`Generated: ${outputPath}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
