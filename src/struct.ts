import { Buffer } from 'node:buffer';
import { DataStructError } from './errors.js';
import type { AnyCodec, Codec, CodecImpl, EncodePlan, Infer, Schema } from './types.js';

const ARRAY_LENGTH_MAX = 0xffff;

function isCodec(v: unknown): v is AnyCodec {
  return (
    typeof v === 'object' &&
    v !== null &&
    'impl' in v &&
    'tag' in v &&
    typeof (v as { tag: unknown }).tag === 'number'
  );
}

function compile(schema: Schema, path: string): AnyCodec {
  if (isCodec(schema)) return schema;
  if (Array.isArray(schema)) {
    if (schema.length !== 1) {
      throw new DataStructError(
        'INVALID_SCHEMA',
        `array schema must have exactly one element descriptor, got ${schema.length}`,
        { path },
      );
    }
    const element = schema[0];
    if (element === undefined) {
      throw new DataStructError('INVALID_SCHEMA', 'array schema element is undefined', { path });
    }
    return arrayCodec(compile(element, `${path}[]`));
  }
  if (typeof schema === 'object' && schema !== null) {
    return structCodec(schema as Record<string, Schema>, path);
  }
  throw new DataStructError('INVALID_SCHEMA', `unsupported schema node: ${String(schema)}`, {
    path,
  });
}

function arrayCodec(element: AnyCodec): Codec<unknown[]> {
  const elementSize = element.size;
  const impl: CodecImpl<unknown[]> = {
    measure(value, plan, path) {
      if (!Array.isArray(value)) {
        throw new DataStructError('SCHEMA_MISMATCH', `expected array, got ${typeof value}`, {
          path,
        });
      }
      if (value.length > ARRAY_LENGTH_MAX) {
        throw new DataStructError(
          'ARRAY_TOO_LONG',
          `array length ${value.length} exceeds ${ARRAY_LENGTH_MAX}`,
          { path },
        );
      }
      // Fast path: every element is fixed-size, total = 2 + n * size.
      if (elementSize !== null) return 2 + value.length * elementSize;
      let size = 2;
      for (let i = 0; i < value.length; i++) {
        size += element.impl.measure(value[i], plan, `${path}[${i}]`);
      }
      return size;
    },
    write(view, bytes, offset, value, plan, path) {
      view.setUint16(offset, value.length, false);
      offset += 2;
      for (let i = 0; i < value.length; i++) {
        offset = element.impl.write(view, bytes, offset, value[i], plan, `${path}[${i}]`);
      }
      return offset;
    },
    read(view, bytes, offset, path) {
      if (offset + 2 > view.byteLength) {
        throw new DataStructError(
          'BUFFER_UNDERFLOW',
          `need 2 byte(s) for array length at offset ${offset}`,
          { path, offset },
        );
      }
      const length = view.getUint16(offset, false);
      offset += 2;
      const out = new Array<unknown>(length);
      for (let i = 0; i < length; i++) {
        const r = element.impl.read(view, bytes, offset, `${path}[${i}]`);
        out[i] = r.value;
        offset = r.offset;
      }
      return { value: out, offset };
    },
  };
  return { tag: 0x100, size: null, impl };
}

function structCodec(
  schema: Record<string, Schema>,
  basePath: string,
): Codec<Record<string, unknown>> {
  const keys = Object.keys(schema);
  const fields: [string, AnyCodec][] = keys.map((key) => {
    const child = schema[key];
    if (child === undefined) {
      throw new DataStructError('INVALID_SCHEMA', `field "${key}" is undefined`, {
        path: `${basePath}.${key}`,
      });
    }
    return [key, compile(child, `${basePath}.${key}`)];
  });

  // If every field is fixed-size, the struct itself is fixed-size:
  // measure becomes a closure-captured constant and skips the field walk.
  let fixedTotal: number | null = 0;
  for (const [, codec] of fields) {
    if (codec.size === null) {
      fixedTotal = null;
      break;
    }
    fixedTotal += codec.size;
  }
  const structSize = fixedTotal;

  const impl: CodecImpl<Record<string, unknown>> = {
    measure(value, plan, path) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new DataStructError('SCHEMA_MISMATCH', `expected object, got ${typeof value}`, {
          path,
        });
      }
      if (structSize !== null) return structSize;
      const obj = value as Record<string, unknown>;
      let size = 0;
      for (const [key, codec] of fields) {
        size += codec.impl.measure(obj[key], plan, `${path}.${key}`);
      }
      return size;
    },
    write(view, bytes, offset, value, plan, path) {
      for (const [key, codec] of fields) {
        offset = codec.impl.write(view, bytes, offset, value[key], plan, `${path}.${key}`);
      }
      return offset;
    },
    read(view, bytes, offset, path) {
      // Null-prototype output neutralizes a __proto__ key in the schema:
      // out['__proto__'] = obj would otherwise mutate the prototype chain.
      const out = Object.create(null) as Record<string, unknown>;
      for (const [key, codec] of fields) {
        const r = codec.impl.read(view, bytes, offset, `${path}.${key}`);
        out[key] = r.value;
        offset = r.offset;
      }
      return { value: out, offset };
    },
  };
  return { tag: 0x300, size: structSize, impl };
}

export interface Struct<S extends Schema> {
  readonly schema: S;
  encode(value: Infer<S>): Buffer;
  decode(input: Uint8Array): Infer<S>;
  sizeOf(value: Infer<S>): number;
}

export function struct<S extends Schema>(schema: S): Struct<S> {
  const codec = compile(schema, '$');

  return {
    schema,
    encode(value): Buffer {
      const plan: EncodePlan = { strings: [], cursor: 0 };
      const size = codec.impl.measure(value, plan, '$');
      const out = Buffer.allocUnsafe(size);
      const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
      plan.cursor = 0;
      const written = codec.impl.write(view, out, 0, value, plan, '$');
      // Defense in depth: allocUnsafe returned uninitialized memory; if a codec's
      // measure() over-counts versus what write() actually emits, we would leak
      // pool bytes. This assertion makes that class of bug visible instead of silent.
      if (written !== size) {
        throw new DataStructError(
          'INVALID_SCHEMA',
          `internal size mismatch: measured ${size}, wrote ${written}`,
        );
      }
      return out;
    },
    decode(input): Infer<S> {
      if (!(input instanceof Uint8Array)) {
        throw new DataStructError(
          'SCHEMA_MISMATCH',
          `decode expects Uint8Array, got ${typeof input}`,
        );
      }
      const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
      const { value } = codec.impl.read(view, input, 0, '$');
      return value as Infer<S>;
    },
    sizeOf(value): number {
      return codec.impl.measure(value, { strings: [], cursor: 0 }, '$');
    },
  };
}

export function encode<S extends Schema>(value: Infer<S>, schema: S): Buffer {
  return struct(schema).encode(value);
}

export function decode<S extends Schema>(input: Uint8Array, schema: S): Infer<S> {
  return struct(schema).decode(input);
}
