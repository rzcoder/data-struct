import { decode, encode, struct, t } from '../src/index.js';

// Single primitive: a 4-byte big-endian unsigned int.
const u32Buf = encode(0xdead_beef, t.u32);
console.log('u32 buffer :', u32Buf.toString('hex'));
console.log('u32 decoded:', decode(u32Buf, t.u32).toString(16));

// String: 2-byte length prefix followed by UTF-8 bytes.
const strBuf = encode('hello', t.string);
console.log('string buffer :', strBuf.toString('hex'));
console.log('string decoded:', decode(strBuf, t.string));

// Object: fields encoded in declared key order, no header.
const User = struct({ id: t.u32, name: t.string, active: t.bool });
const userBuf = User.encode({ id: 7, name: 'ada', active: true });
console.log('user buffer :', userBuf.toString('hex'));
console.log('user decoded:', User.decode(userBuf));
