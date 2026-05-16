import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { DataStructError, decode, encode, t } from '../src/index.js';

describe('errors', () => {
  it('throws VALUE_OUT_OF_RANGE for negative uint', () => {
    try {
      encode(-1, t.u8);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(DataStructError);
      expect((err as DataStructError).code).toBe('VALUE_OUT_OF_RANGE');
    }
  });

  it('throws VALUE_OUT_OF_RANGE for overflow', () => {
    expect(() => encode(256, t.u8)).toThrow(/u8/);
    expect(() => encode(0x10000, t.u16)).toThrow(/u16/);
    expect(() => encode(2.5, t.i32)).toThrow(/integer/);
  });

  it('throws STRING_TOO_LONG for >64KiB strings', () => {
    const huge = 'a'.repeat(65536);
    try {
      encode(huge, t.string);
      throw new Error('expected throw');
    } catch (err) {
      expect((err as DataStructError).code).toBe('STRING_TOO_LONG');
    }
  });

  it('throws ARRAY_TOO_LONG for >64KiB arrays', () => {
    const huge = new Array(65536).fill(0);
    try {
      encode(huge, [t.u8]);
      throw new Error('expected throw');
    } catch (err) {
      expect((err as DataStructError).code).toBe('ARRAY_TOO_LONG');
    }
  });

  it('throws BUFFER_UNDERFLOW when decode runs past end', () => {
    try {
      decode(Buffer.from([0x00]), t.u16);
      throw new Error('expected throw');
    } catch (err) {
      expect((err as DataStructError).code).toBe('BUFFER_UNDERFLOW');
    }
  });

  it('throws SCHEMA_MISMATCH when value shape is wrong', () => {
    try {
      encode('not an array' as never, [t.u8]);
      throw new Error('expected throw');
    } catch (err) {
      expect((err as DataStructError).code).toBe('SCHEMA_MISMATCH');
    }
  });

  it('includes the field path in error messages', () => {
    try {
      encode({ outer: { inner: -5 } }, { outer: { inner: t.u8 } });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as DataStructError;
      expect(e.code).toBe('VALUE_OUT_OF_RANGE');
      expect(e.path).toBe('$.outer.inner');
      expect(e.message).toContain('$.outer.inner');
    }
  });

  it('throws INVALID_SCHEMA for malformed array schema', () => {
    try {
      encode([1, 2], [t.u8, t.u16]);
      throw new Error('expected throw');
    } catch (err) {
      expect((err as DataStructError).code).toBe('INVALID_SCHEMA');
    }
  });

  it('throws SCHEMA_MISMATCH when string codec receives a non-string', () => {
    expect(() => encode(42 as never, t.string)).toThrow(/string requires string/);
  });

  it('throws SCHEMA_MISMATCH when shortBytes / bytes receive non-Uint8Array', () => {
    expect(() => encode([1, 2, 3] as never, t.shortBytes)).toThrow(/Uint8Array/);
    expect(() => encode('not bytes' as never, t.bytes)).toThrow(/Uint8Array/);
  });

  it('throws BYTES_TOO_LONG for shortBytes > 65535', () => {
    const huge = new Uint8Array(65536);
    expect(() => encode(huge, t.shortBytes)).toThrow(/shortBytes length/);
  });

  it('throws SCHEMA_MISMATCH for non-object value against struct schema', () => {
    expect(() => encode(null as never, { a: t.u8 })).toThrow(/expected object/);
    expect(() => encode([1] as never, { a: t.u8 })).toThrow(/expected object/);
  });

  it('throws SCHEMA_MISMATCH when decode input is not Uint8Array', () => {
    expect(() => decode('not bytes' as never, t.u8)).toThrow(/Uint8Array/);
  });

  it('throws VALUE_OUT_OF_RANGE for non-bigint i64/u64', () => {
    expect(() => encode(5 as never, t.i64)).toThrow(/bigint/);
    expect(() => encode(-1n, t.u64)).toThrow(/bigint/);
  });

  it('throws SCHEMA_MISMATCH for bool with non-boolean input', () => {
    expect(() => encode(1 as never, t.bool)).toThrow(/bool requires boolean/);
  });

  it('throws VALUE_OUT_OF_RANGE for non-number floats', () => {
    expect(() => encode('nope' as never, t.f64)).toThrow(/f64/);
  });
});
