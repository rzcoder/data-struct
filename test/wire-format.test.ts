import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { decode, encode, t } from '../src/index.js';
import type { Schema } from '../src/index.js';

interface Fixture {
  readonly name: string;
  readonly schema: Schema;
  readonly value: unknown;
  readonly bytes: Buffer;
}

const fixtures: Fixture[] = [
  {
    name: 'leaf u16',
    schema: t.u16,
    value: 42,
    bytes: Buffer.from([0x00, 0x2a]),
  },
  {
    name: 'flat numeric struct',
    schema: {
      boolean: t.bool,
      int8: t.i8,
      uint8: t.u8,
      int16: t.i16,
      uint16: t.u16,
      int32: t.i32,
      uint32: t.u32,
      float: t.f32,
      double: t.f64,
    },
    value: {
      boolean: true,
      int8: -126,
      uint8: 255,
      int16: -1000,
      uint16: 65535,
      int32: -100000,
      uint32: 100000,
      float: 1230000,
      double: -123.456,
    },
    bytes: Buffer.from([
      0x01, 0x82, 0xff, 0xfc, 0x18, 0xff, 0xff, 0xff, 0xfe, 0x79, 0x60, 0x00, 0x01, 0x86, 0xa0,
      0x49, 0x96, 0x25, 0x80, 0xc0, 0x5e, 0xdd, 0x2f, 0x1a, 0x9f, 0xbe, 0x77,
    ]),
  },
  {
    name: 'string + bytes variants',
    schema: {
      str: t.string,
      shortBytes: t.shortBytes,
      bytes: t.bytes,
    },
    value: {
      str: 'Some text + юникод',
      shortBytes: new Uint8Array([1, 2, 3]),
      bytes: new Uint8Array([0xaa, 0xbb, 0xcc]),
    },
    bytes: Buffer.from([
      0x00, 0x18, 0x53, 0x6f, 0x6d, 0x65, 0x20, 0x74, 0x65, 0x78, 0x74, 0x20, 0x2b, 0x20, 0xd1,
      0x8e, 0xd0, 0xbd, 0xd0, 0xb8, 0xd0, 0xba, 0xd0, 0xbe, 0xd0, 0xb4, 0x00, 0x03, 0x01, 0x02,
      0x03, 0x00, 0x00, 0x00, 0x03, 0xaa, 0xbb, 0xcc,
    ]),
  },
  {
    name: 'list of strings',
    schema: { values: [t.string] },
    value: { values: ['string1', 'string20', 'string300'] },
    bytes: Buffer.from([
      0x00, 0x03, 0x00, 0x07, 0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x31, 0x00, 0x08, 0x73, 0x74,
      0x72, 0x69, 0x6e, 0x67, 0x32, 0x30, 0x00, 0x09, 0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x33,
      0x30, 0x30,
    ]),
  },
  {
    name: 'list of objects + list of u8',
    schema: {
      friends: [{ name: t.string, age: t.u32 }],
      numbers: [t.u8],
    },
    value: {
      friends: [
        { name: 'Alice', age: 21 },
        { name: 'Bob', age: 17 },
      ],
      numbers: [0x10, 0x26, 0x61, 0xff],
    },
    bytes: Buffer.from([
      0x00, 0x02, 0x00, 0x05, 0x41, 0x6c, 0x69, 0x63, 0x65, 0x00, 0x00, 0x00, 0x15, 0x00, 0x03,
      0x42, 0x6f, 0x62, 0x00, 0x00, 0x00, 0x11, 0x00, 0x04, 0x10, 0x26, 0x61, 0xff,
    ]),
  },
];

describe('wire format (byte-identical to legacy v0.0.11)', () => {
  for (const fixture of fixtures) {
    describe(fixture.name, () => {
      it('encode produces the golden byte sequence', () => {
        const encoded = encode(fixture.value as never, fixture.schema);
        expect(Buffer.from(encoded).equals(fixture.bytes)).toBe(true);
      });

      it('decode reverses the golden byte sequence', () => {
        const decoded = decode(fixture.bytes, fixture.schema);
        expect(decoded).toEqual(fixture.value);
      });
    });
  }
});
