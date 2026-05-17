import { struct, t } from '../src/index.js';

const Row = struct({ id: t.u32, name: t.string });

// sizeOf returns the exact byte length encode() will produce for that value.
const single = { id: 42, name: 'hello' };
console.log('single sizeOf :', Row.sizeOf(single)); // 4 (u32) + 2 (len) + 5 (utf-8) = 11
console.log('single encoded:', Row.encode(single).byteLength);

// Pre-compute total bytes for a batch before allocating your own output buffer.
const batch = Array.from({ length: 5 }, (_, i) => ({ id: i, name: `item-${i}` }));
let totalRowBytes = 0;
for (const item of batch) totalRowBytes += Row.sizeOf(item);
console.log(`sum of ${batch.length} row sizes:`, totalRowBytes);

// When you encode the array as a single value, the wire format adds 2 bytes
// for the array length prefix, so the result is totalRowBytes + 2.
const Batch = struct([{ id: t.u32, name: t.string }]);
const batchBuf = Batch.encode(batch);
console.log('encoded batch :', batchBuf.byteLength, '(rows + 2-byte array length prefix)');
