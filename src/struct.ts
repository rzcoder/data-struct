import { Buffer } from 'node:buffer';
import { DataStructError } from './errors.js';
import type { AnyCodec, Codec, CodecImpl, EncodePlan, Infer, Schema } from './types.js';

const ARRAY_LENGTH_MAX = 0xffff;
const PATH_AT = ' at ';

function isCodec(v: unknown): v is AnyCodec {
  return (
    typeof v === 'object' &&
    v !== null &&
    'impl' in v &&
    'tag' in v &&
    typeof (v as { tag: unknown }).tag === 'number'
  );
}

// Re-throw a DataStructError after prefixing its path with a new segment.
// `segment` is either `.field` or `[index]`. Only allocated on the error path.
function rethrowWithPrefix(err: unknown, segment: string): never {
  if (!(err instanceof DataStructError)) throw err;
  const oldPath = err.path === '$' ? '' : err.path.slice(1);
  const newPath = `$${segment}${oldPath}`;
  // DataStructError's constructor appends " at <path>" to the message when
  // a path is provided; strip the previous suffix so we don't accumulate.
  const oldSuffix = err.path === '$' ? '' : `${PATH_AT}${err.path}`;
  const baseMessage =
    oldSuffix && err.message.endsWith(oldSuffix)
      ? err.message.slice(0, -oldSuffix.length)
      : err.message;
  const opts: { path: string; offset?: number; cause?: unknown } = { path: newPath };
  if (err.offset !== undefined) opts.offset = err.offset;
  opts.cause = err.cause ?? err;
  throw new DataStructError(err.code, baseMessage, opts);
}

function compile(schema: Schema): AnyCodec {
  if (isCodec(schema)) return schema;
  if (Array.isArray(schema)) {
    if (schema.length !== 1) {
      throw new DataStructError(
        'INVALID_SCHEMA',
        `array schema must have exactly one element descriptor, got ${schema.length}`,
      );
    }
    const element = schema[0];
    if (element === undefined) {
      throw new DataStructError('INVALID_SCHEMA', 'array schema element is undefined');
    }
    return arrayCodec(compile(element));
  }
  if (typeof schema === 'object' && schema !== null) {
    return structCodec(schema as Record<string, Schema>);
  }
  throw new DataStructError('INVALID_SCHEMA', `unsupported schema node: ${String(schema)}`);
}

function arrayCodec(element: AnyCodec): Codec<unknown[]> {
  const impl: CodecImpl<unknown[]> = {
    measure(value, plan) {
      if (!Array.isArray(value)) {
        throw new DataStructError('SCHEMA_MISMATCH', `expected array, got ${typeof value}`);
      }
      if (value.length > ARRAY_LENGTH_MAX) {
        throw new DataStructError(
          'ARRAY_TOO_LONG',
          `array length ${value.length} exceeds ${ARRAY_LENGTH_MAX}`,
        );
      }
      let size = 2;
      for (let i = 0; i < value.length; i++) {
        try {
          size += element.impl.measure(value[i], plan);
        } catch (e) {
          rethrowWithPrefix(e, `[${i}]`);
        }
      }
      return size;
    },
    write(view, bytes, offset, value, plan) {
      view.setUint16(offset, value.length, false);
      offset += 2;
      for (let i = 0; i < value.length; i++) {
        try {
          offset = element.impl.write(view, bytes, offset, value[i], plan);
        } catch (e) {
          rethrowWithPrefix(e, `[${i}]`);
        }
      }
      return offset;
    },
    read(view, bytes, offset) {
      if (offset + 2 > view.byteLength) {
        throw new DataStructError(
          'BUFFER_UNDERFLOW',
          `need 2 byte(s) for array length at offset ${offset}`,
          { offset },
        );
      }
      const length = view.getUint16(offset, false);
      offset += 2;
      const out = new Array<unknown>(length);
      for (let i = 0; i < length; i++) {
        try {
          const r = element.impl.read(view, bytes, offset);
          out[i] = r.value;
          offset = r.offset;
        } catch (e) {
          rethrowWithPrefix(e, `[${i}]`);
        }
      }
      return { value: out, offset };
    },
  };
  return { tag: 0x100, impl };
}

function structCodec(schema: Record<string, Schema>): Codec<Record<string, unknown>> {
  const keys = Object.keys(schema);
  const fields: [string, AnyCodec][] = keys.map((key) => {
    const child = schema[key];
    if (child === undefined) {
      throw new DataStructError('INVALID_SCHEMA', `field "${key}" is undefined`);
    }
    return [key, compile(child)];
  });

  const impl: CodecImpl<Record<string, unknown>> = {
    measure(value, plan) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new DataStructError('SCHEMA_MISMATCH', `expected object, got ${typeof value}`);
      }
      const obj = value as Record<string, unknown>;
      let size = 0;
      for (const [key, codec] of fields) {
        try {
          size += codec.impl.measure(obj[key], plan);
        } catch (e) {
          rethrowWithPrefix(e, `.${key}`);
        }
      }
      return size;
    },
    write(view, bytes, offset, value, plan) {
      for (const [key, codec] of fields) {
        try {
          offset = codec.impl.write(view, bytes, offset, value[key], plan);
        } catch (e) {
          rethrowWithPrefix(e, `.${key}`);
        }
      }
      return offset;
    },
    read(view, bytes, offset) {
      const out = Object.create(null) as Record<string, unknown>;
      for (const [key, codec] of fields) {
        try {
          const r = codec.impl.read(view, bytes, offset);
          out[key] = r.value;
          offset = r.offset;
        } catch (e) {
          rethrowWithPrefix(e, `.${key}`);
        }
      }
      return { value: out, offset };
    },
  };
  return { tag: 0x300, impl };
}

export interface Struct<S extends Schema> {
  readonly schema: S;
  encode(value: Infer<S>): Buffer;
  decode(input: Uint8Array): Infer<S>;
  sizeOf(value: Infer<S>): number;
}

export function struct<S extends Schema>(schema: S): Struct<S> {
  const codec = compile(schema);

  return {
    schema,
    encode(value): Buffer {
      const plan: EncodePlan = { strings: [], cursor: 0 };
      const size = codec.impl.measure(value, plan);
      const out = Buffer.allocUnsafe(size);
      const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
      plan.cursor = 0;
      const written = codec.impl.write(view, out, 0, value, plan);
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
      const { value } = codec.impl.read(view, input, 0);
      return value as Infer<S>;
    },
    sizeOf(value): number {
      return codec.impl.measure(value, { strings: [], cursor: 0 });
    },
  };
}

export function encode<S extends Schema>(value: Infer<S>, schema: S): Buffer {
  return struct(schema).encode(value);
}

export function decode<S extends Schema>(input: Uint8Array, schema: S): Infer<S> {
  return struct(schema).decode(input);
}
