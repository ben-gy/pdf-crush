import { encode } from '@jsquash/jpeg';
import type { WorkerInMsg, WorkerOutMsg } from './types';

self.addEventListener('message', async (event: MessageEvent<WorkerInMsg>) => {
  const msg = event.data;
  if (msg.type !== 'encode') return;

  try {
    const { pixels, width, height, quality, pageNum } = msg;
    const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height);
    const jpegBuffer = await encode(imageData, { quality });
    const out: WorkerOutMsg = { type: 'encoded', jpegBytes: jpegBuffer, pageNum };
    (self as DedicatedWorkerGlobalScope).postMessage(out, [jpegBuffer]);
  } catch (err) {
    const out: WorkerOutMsg = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
      pageNum: msg.pageNum,
    };
    self.postMessage(out);
  }
});
