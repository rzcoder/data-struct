import { decode, encode, t } from '../src/index.js';

// Big-endian (default) vs little-endian for the same value.
const value = 0x1122_3344;
const beBuf = encode(value, t.u32);
const leBuf = encode(value, t.le.u32);

console.log('be u32:', beBuf.toString('hex')); // 11223344
console.log('le u32:', leBuf.toString('hex')); // 44332211

// The length prefix on strings also flips with t.le.string.
const beStr = encode('hi', t.string);
const leStr = encode('hi', t.le.string);
console.log('be string:', beStr.toString('hex')); // 00026869
console.log('le string:', leStr.toString('hex')); // 02006869

// Roundtrip via the LE codec.
console.log('le u32 decoded:', decode(leBuf, t.le.u32).toString(16));
console.log('le string decoded:', decode(leStr, t.le.string));
