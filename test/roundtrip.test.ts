import { Buffer } from 'node:buffer';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { decode, encode, struct, t } from '../src/index.js';
import type { Infer } from '../src/index.js';

describe('roundtrip', () => {
  it('deeply nested struct', () => {
    const schema = {
      nested: { nested2: { nested3: { nested4: { nested5: t.u8 } } } },
    };
    const value = { nested: { nested2: { nested3: { nested4: { nested5: 42 } } } } };
    expect(decode(encode(value, schema), schema)).toEqual(value);
  });

  it('list of list', () => {
    const schema = [[t.i16]];
    const value = [
      [90, 10, 101],
      [20, 30, 400],
      [100, 110, 1],
    ];
    expect(decode(encode(value, schema), schema)).toEqual(value);
  });

  it('list of list of list of list of object', () => {
    const schema = { list: [[[[{ i: t.i16 }]]]] };
    const value = {
      list: [[[[{ i: 1 }, { i: 2 }, { i: 3 }], [{ i: 1 }]], [[{ i: 1 }]]]],
    };
    expect(decode(encode(value, schema), schema)).toEqual(value);
  });

  it('struct() factory produces same output as encode/decode', () => {
    const codec = struct({ a: t.u32, b: t.string });
    const v = { a: 1234567, b: 'hello' };
    const buf = codec.encode(v);
    expect(codec.decode(buf)).toEqual(v);
    expect(codec.sizeOf(v)).toBe(buf.byteLength);
  });

  it('decoded shortBytes / bytes are independent copies of the source', () => {
    const schema = { x: t.shortBytes };
    const src = Buffer.from([0x00, 0x02, 0xaa, 0xbb]);
    const { x } = decode(src, schema);
    src[2] = 0;
    expect(x[0]).toBe(0xaa);
  });

  it('accepts plain Uint8Array as input', () => {
    const buf = encode({ b: Buffer.from([1, 2, 3]) }, { b: t.shortBytes });
    const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const out = decode(view, { b: t.shortBytes });
    expect(Array.from(out.b)).toEqual([1, 2, 3]);
  });

  it('all primitive number types roundtrip at boundaries', () => {
    const cases: { codec: { tag: number }; values: number[] }[] = [
      { codec: t.i8, values: [-128, 0, 127] },
      { codec: t.u8, values: [0, 255] },
      { codec: t.i16, values: [-32768, 0, 32767] },
      { codec: t.u16, values: [0, 65535] },
      { codec: t.i32, values: [-2147483648, 0, 2147483647] },
      { codec: t.u32, values: [0, 4294967295] },
    ];
    for (const { codec, values } of cases) {
      for (const v of values) {
        const buf = encode(v as never, codec as never);
        expect(decode(buf, codec as never)).toBe(v);
      }
    }
  });

  it('bigint i64 / u64 roundtrip', () => {
    expect(decode(encode(-(1n << 63n), t.i64), t.i64)).toBe(-(1n << 63n));
    expect(decode(encode((1n << 63n) - 1n, t.i64), t.i64)).toBe((1n << 63n) - 1n);
    expect(decode(encode((1n << 64n) - 1n, t.u64), t.u64)).toBe((1n << 64n) - 1n);
  });

  it('little-endian codecs produce LE bytes', () => {
    expect(Array.from(encode(0x1234, t.le.u16))).toEqual([0x34, 0x12]);
    expect(Array.from(encode(0x12345678, t.le.u32))).toEqual([0x78, 0x56, 0x34, 0x12]);
    expect(decode(encode(-1, t.le.i32), t.le.i32)).toBe(-1);
  });

  it('empty string and empty array roundtrip', () => {
    expect(decode(encode('', t.string), t.string)).toBe('');
    expect(decode(encode([], [t.u8]), [t.u8])).toEqual([]);
  });

  it('Infer<S> derives the value type', () => {
    const schema = {
      id: t.u32,
      name: t.string,
      tags: [t.string],
      active: t.bool,
    } as const;
    type Value = Infer<typeof schema>;
    expectTypeOf<Value>().toEqualTypeOf<{
      id: number;
      name: string;
      tags: string[];
      active: boolean;
    }>();
  });

  it('Infer<S> works for top-level array schemas (no object wrapper)', () => {
    // Plain `[t.u8]` literal — must infer as number[]
    expectTypeOf<Infer<typeof t.u8 extends infer _ ? [typeof t.u8] : never>>().toEqualTypeOf<
      number[]
    >();

    // `as const` form (readonly tuple)
    const ro = [t.string] as const;
    expectTypeOf<Infer<typeof ro>>().toEqualTypeOf<string[]>();

    // Nested arrays
    const matrix = [[t.i16]];
    expectTypeOf<Infer<typeof matrix>>().toEqualTypeOf<number[][]>();

    // Array of structs
    const list = [{ id: t.u32, name: t.string }];
    expectTypeOf<Infer<typeof list>>().toEqualTypeOf<{ id: number; name: string }[]>();

    // struct() factory accepting an array schema directly
    const codec = struct([t.u8]);
    expectTypeOf(codec.encode).parameter(0).toEqualTypeOf<number[]>();
    expectTypeOf(codec.decode).returns.toEqualTypeOf<number[]>();

    // Runtime roundtrip on the same array codec
    const buf = codec.encode([1, 2, 3, 255]);
    expect(codec.decode(buf)).toEqual([1, 2, 3, 255]);
  });
});
