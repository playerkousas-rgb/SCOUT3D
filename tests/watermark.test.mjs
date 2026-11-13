// 截圖水印測試（W2）· SCOUT3D · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { embed, decode, makePayloadV2, PREFIX_V2, STEP } from '../src/lib/scout_watermark_codec_v1.0.mjs';

function scene(w = 320, h = 320) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = 200 + ((x * 7) % 30);
      data[i + 1] = 120 + ((y * 5) % 40);
      data[i + 2] = 60 + ((x + y) % 50);
      data[i + 3] = 255;
    }
  return { data, width: w, height: h };
}

test('codec 常數未被改', () => {
  assert.equal(STEP, 32);
  assert.equal(PREFIX_V2, 'SCOUTSYSTEM|v2|');
});

test('截圖 payload 嵌入後解得返', () => {
  const payload = makePayloadV2({ unit: 'S3D1', date: '20261113', hash: 'GRHP' });
  assert.equal(payload, 'SCOUTSYSTEM|v2|S3D1|20261113|GRHP');
  const img = scene();
  embed(img, payload);
  const r = decode(img);
  assert.equal(r.found, true);
  assert.equal(r.payload, payload);
  assert.equal(r.unit, "S3D1");
});
