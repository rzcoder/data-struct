import { DataStructError } from './errors.js';
import type { Codec, CodecImpl } from './types.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

const U8_MAX = 0xff;
const U16_MAX = 0xffff;
const U32_MAX = 0xffffffff;
const I8_MIN = -0x80;
const I8_MAX = 0x7f;
const I16_MIN = -0x8000;
const I16_MAX = 0x7fff;
const I32_MIN = -0x80000000;
const I32_MAX = 0x7fffffff;
const I64_MIN = -(1n << 63n);
const I64_MAX = (1n << 63n) - 1n;
const U64_MAX = (1n << 64n) - 1n;

function ensureCapacity(view: DataView, offset: number, need: number, path: string): void {
  if (offset + need > view.byteLength) {
    throw new DataStructError(
      'BUFFER_UNDERFLOW',
      `need ${need} byte(s) at offset ${offset}, but buffer has ${view.byteLength}`,
      { path, offset },
    );
  }
}

function ensureInt(value: number, min: number, max: number, type: string, path: string): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new DataStructError(
      'VALUE_OUT_OF_RANGE',
      `${type} requires integer in [${min}, ${max}], got ${value}`,
      {
        path,
      },
    );
  }
}

function ensureFiniteNumber(value: number, type: string, path: string): void {
  if (typeof value !== 'number') {
    throw new DataStructError(
      'VALUE_OUT_OF_RANGE',
      `${type} requires number, got ${typeof value}`,
      { path },
    );
  }
}

function ensureBigInt(value: bigint, min: bigint, max: bigint, type: string, path: string): void {
  if (typeof value !== 'bigint' || value < min || value > max) {
    throw new DataStructError(
      'VALUE_OUT_OF_RANGE',
      `${type} requires bigint in [${min}, ${max}], got ${value}`,
      {
        path,
      },
    );
  }
}

function ensureUint8Array(value: unknown, type: string, path: string): asserts value is Uint8Array {
  if (!(value instanceof Uint8Array)) {
    throw new DataStructError(
      'SCHEMA_MISMATCH',
      `${type} requires Uint8Array, got ${typeof value}`,
      { path },
    );
  }
}

function fixed<T>(
  tag: number,
  size: number,
  write: (view: DataView, offset: number, value: T) => void,
  read: (view: DataView, offset: number) => T,
  validate: (value: T, path: string) => void,
): Codec<T> {
  const impl: CodecImpl<T> = {
    measure: () => size,
    write(view, _bytes, offset, value, _plan, path) {
      validate(value, path);
      write(view, offset, value);
      return offset + size;
    },
    read(view, _bytes, offset, path) {
      ensureCapacity(view, offset, size, path);
      return { value: read(view, offset), offset: offset + size };
    },
  };
  return { tag, impl };
}

const boolImpl: CodecImpl<boolean> = {
  measure: () => 1,
  write(view, _bytes, offset, value, _plan, path) {
    if (typeof value !== 'boolean') {
      throw new DataStructError('SCHEMA_MISMATCH', `bool requires boolean, got ${typeof value}`, {
        path,
      });
    }
    view.setUint8(offset, value ? 1 : 0);
    return offset + 1;
  },
  read(view, _bytes, offset, path) {
    ensureCapacity(view, offset, 1, path);
    return { value: view.getInt8(offset) !== 0, offset: offset + 1 };
  },
};

function makeString(littleEndian: boolean, tag: number): Codec<string> {
  const impl: CodecImpl<string> = {
    measure(value, plan, path) {
      if (typeof value !== 'string') {
        throw new DataStructError(
          'SCHEMA_MISMATCH',
          `string requires string, got ${typeof value}`,
          { path },
        );
      }
      const encoded = textEncoder.encode(value);
      if (encoded.byteLength > U16_MAX) {
        throw new DataStructError(
          'STRING_TOO_LONG',
          `string UTF-8 byte length ${encoded.byteLength} exceeds 65535`,
          { path },
        );
      }
      plan.strings.push(encoded);
      return 2 + encoded.byteLength;
    },
    write(view, bytes, offset, _value, plan) {
      const encoded = plan.strings[plan.cursor++] as Uint8Array;
      view.setUint16(offset, encoded.byteLength, littleEndian);
      offset += 2;
      bytes.set(encoded, offset);
      return offset + encoded.byteLength;
    },
    read(view, bytes, offset, path) {
      ensureCapacity(view, offset, 2, path);
      const length = view.getUint16(offset, littleEndian);
      offset += 2;
      ensureCapacity(view, offset, length, path);
      let value: string;
      try {
        value = textDecoder.decode(bytes.subarray(offset, offset + length));
      } catch (cause) {
        throw new DataStructError('SCHEMA_MISMATCH', 'invalid UTF-8 in string field', {
          path,
          offset,
          cause,
        });
      }
      return { value, offset: offset + length };
    },
  };
  return { tag, impl };
}

function makeShortBytes(littleEndian: boolean, tag: number): Codec<Uint8Array> {
  const impl: CodecImpl<Uint8Array> = {
    measure(value, _plan, path) {
      ensureUint8Array(value, 'shortBytes', path);
      if (value.byteLength > U16_MAX) {
        throw new DataStructError(
          'BYTES_TOO_LONG',
          `shortBytes length ${value.byteLength} exceeds 65535`,
          { path },
        );
      }
      return 2 + value.byteLength;
    },
    write(view, bytes, offset, value) {
      view.setUint16(offset, value.byteLength, littleEndian);
      offset += 2;
      bytes.set(value, offset);
      return offset + value.byteLength;
    },
    read(view, bytes, offset, path) {
      ensureCapacity(view, offset, 2, path);
      const length = view.getUint16(offset, littleEndian);
      offset += 2;
      ensureCapacity(view, offset, length, path);
      const value = new Uint8Array(length);
      value.set(bytes.subarray(offset, offset + length));
      return { value, offset: offset + length };
    },
  };
  return { tag, impl };
}

function makeBytes(littleEndian: boolean, tag: number): Codec<Uint8Array> {
  const impl: CodecImpl<Uint8Array> = {
    measure(value, _plan, path) {
      ensureUint8Array(value, 'bytes', path);
      if (value.byteLength > U32_MAX) {
        throw new DataStructError(
          'BYTES_TOO_LONG',
          `bytes length ${value.byteLength} exceeds 4294967295`,
          { path },
        );
      }
      return 4 + value.byteLength;
    },
    write(view, bytes, offset, value) {
      view.setUint32(offset, value.byteLength, littleEndian);
      offset += 4;
      bytes.set(value, offset);
      return offset + value.byteLength;
    },
    read(view, bytes, offset, path) {
      ensureCapacity(view, offset, 4, path);
      const length = view.getUint32(offset, littleEndian);
      offset += 4;
      ensureCapacity(view, offset, length, path);
      const value = new Uint8Array(length);
      value.set(bytes.subarray(offset, offset + length));
      return { value, offset: offset + length };
    },
  };
  return { tag, impl };
}

function intCodec(
  tag: number,
  size: number,
  signed: boolean,
  min: number,
  max: number,
  name: string,
  littleEndian: boolean,
): Codec<number> {
  const setters: Record<string, (view: DataView, o: number, v: number, le: boolean) => void> = {
    'i:1': (v, o, x) => v.setInt8(o, x),
    'u:1': (v, o, x) => v.setUint8(o, x),
    'i:2': (v, o, x, le) => v.setInt16(o, x, le),
    'u:2': (v, o, x, le) => v.setUint16(o, x, le),
    'i:4': (v, o, x, le) => v.setInt32(o, x, le),
    'u:4': (v, o, x, le) => v.setUint32(o, x, le),
  };
  const getters: Record<string, (view: DataView, o: number, le: boolean) => number> = {
    'i:1': (v, o) => v.getInt8(o),
    'u:1': (v, o) => v.getUint8(o),
    'i:2': (v, o, le) => v.getInt16(o, le),
    'u:2': (v, o, le) => v.getUint16(o, le),
    'i:4': (v, o, le) => v.getInt32(o, le),
    'u:4': (v, o, le) => v.getUint32(o, le),
  };
  const key = `${signed ? 'i' : 'u'}:${size}`;
  const setter = setters[key] as (view: DataView, o: number, v: number, le: boolean) => void;
  const getter = getters[key] as (view: DataView, o: number, le: boolean) => number;
  return fixed<number>(
    tag,
    size,
    (view, offset, value) => setter(view, offset, value, littleEndian),
    (view, offset) => getter(view, offset, littleEndian),
    (value, path) => ensureInt(value, min, max, name, path),
  );
}

function floatCodec(tag: number, size: 4 | 8, name: string, littleEndian: boolean): Codec<number> {
  if (size === 4) {
    return fixed<number>(
      tag,
      4,
      (view, offset, value) => view.setFloat32(offset, value, littleEndian),
      (view, offset) => view.getFloat32(offset, littleEndian),
      (value, path) => ensureFiniteNumber(value, name, path),
    );
  }
  return fixed<number>(
    tag,
    8,
    (view, offset, value) => view.setFloat64(offset, value, littleEndian),
    (view, offset) => view.getFloat64(offset, littleEndian),
    (value, path) => ensureFiniteNumber(value, name, path),
  );
}

function bigIntCodec(
  tag: number,
  signed: boolean,
  name: string,
  littleEndian: boolean,
): Codec<bigint> {
  const min = signed ? I64_MIN : 0n;
  const max = signed ? I64_MAX : U64_MAX;
  return fixed<bigint>(
    tag,
    8,
    (view, offset, value) => {
      if (signed) view.setBigInt64(offset, value, littleEndian);
      else view.setBigUint64(offset, value, littleEndian);
    },
    (view, offset) =>
      signed ? view.getBigInt64(offset, littleEndian) : view.getBigUint64(offset, littleEndian),
    (value, path) => ensureBigInt(value, min, max, name, path),
  );
}

// Wire tags preserve legacy numeric ids where applicable for debug/introspection.
const BE = false;
const LE = true;

const beCodecs = {
  bool: { tag: 0x000, impl: boolImpl } as Codec<boolean>,
  i8: intCodec(0x010, 1, true, I8_MIN, I8_MAX, 'i8', BE),
  u8: intCodec(0x011, 1, false, 0, U8_MAX, 'u8', BE),
  i16: intCodec(0x020, 2, true, I16_MIN, I16_MAX, 'i16', BE),
  u16: intCodec(0x021, 2, false, 0, U16_MAX, 'u16', BE),
  i32: intCodec(0x030, 4, true, I32_MIN, I32_MAX, 'i32', BE),
  u32: intCodec(0x031, 4, false, 0, U32_MAX, 'u32', BE),
  f32: floatCodec(0x040, 4, 'f32', BE),
  f64: floatCodec(0x041, 8, 'f64', BE),
  i64: bigIntCodec(0x050, true, 'i64', BE),
  u64: bigIntCodec(0x051, false, 'u64', BE),
  string: makeString(BE, 0x200),
  shortBytes: makeShortBytes(BE, 0x210),
  bytes: makeBytes(BE, 0x211),
};

const leCodecs = {
  i16: intCodec(0x1020, 2, true, I16_MIN, I16_MAX, 'le.i16', LE),
  u16: intCodec(0x1021, 2, false, 0, U16_MAX, 'le.u16', LE),
  i32: intCodec(0x1030, 4, true, I32_MIN, I32_MAX, 'le.i32', LE),
  u32: intCodec(0x1031, 4, false, 0, U32_MAX, 'le.u32', LE),
  f32: floatCodec(0x1040, 4, 'le.f32', LE),
  f64: floatCodec(0x1041, 8, 'le.f64', LE),
  i64: bigIntCodec(0x1050, true, 'le.i64', LE),
  u64: bigIntCodec(0x1051, false, 'le.u64', LE),
  string: makeString(LE, 0x1200),
  shortBytes: makeShortBytes(LE, 0x1210),
  bytes: makeBytes(LE, 0x1211),
};

export const t = {
  ...beCodecs,
  le: leCodecs,
} as const;

export type TypeRegistry = typeof t;
