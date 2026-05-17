import { decode, encode, t } from '../src/index.js';

// One-shot encoding/decoding without keeping a compiled struct around.
// Schemas are plain values, so they compose freely.

const Map2D = [[t.u8]];
const map: number[][] = [
  [0, 1, 0],
  [1, 0, 1],
];
const mapBuf = encode(map, Map2D);
console.log('Map2D buffer :', mapBuf.toString('hex'));
console.log('Map2D decoded:', decode(mapBuf, Map2D));

const Names = [t.string];
const names = ['alice', 'bob', 'carol'];
const namesBuf = encode(names, Names);
console.log('Names buffer :', namesBuf.toString('hex'));
console.log('Names decoded:', decode(namesBuf, Names));
