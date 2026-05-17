# data-struct

[![CI](https://github.com/rzcoder/data-struct/actions/workflows/ci.yml/badge.svg)](https://github.com/rzcoder/data-struct/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/data-struct.svg)](https://www.npmjs.com/package/data-struct)

Schema-driven binary serialization between JavaScript values and Node `Buffer`s.

- **Tiny.** No runtime dependencies.
- **Typed.** A schema infers the exact TypeScript shape of the decoded value via `Infer<S>`.
- **Fast.** Two-pass encoder allocates the output buffer exactly once.
- **Dual-format.** Ships ESM + CommonJS + `.d.ts` for both.
- **Wire-stable.** Big-endian by default, byte-identical with prior `0.0.x` releases.

## Install

```sh
npm install data-struct
```

Requires Node `>=20.9`.

## Usage

```ts
import { struct, t, type Infer } from 'data-struct';

const Hero = struct({
  id: t.u32,
  name: t.string,
  hp: t.i16,
  skills: [{ id: t.u16, description: t.string }],
  playable: t.bool,
  experience: t.u32,
  position: { x: t.u16, y: t.u16 },
});

type Hero = Infer<typeof Hero.schema>;

const buf = Hero.encode({
  id: 9,
  name: 'CirnoBaka',
  hp: 146,
  skills: [
    { id: 34, description: 'freezing frogs' },
    { id: 16, description: 'perfect math' },
  ],
  playable: false,
  experience: 99_999_999,
  position: { x: 2, y: 3 },
});

const hero = Hero.decode(buf); // typed as Hero
```

Functional form, when you don't want to keep a compiled `struct` around:

```ts
import { encode, decode, t } from 'data-struct';

const Map2D = [[t.u8]];
const buf = encode([[0, 1, 0], [1, 0, 1]], Map2D);
const map = decode(buf, Map2D); // number[][]
```

## API

### Codec tokens — `t`

| Token            | Bytes      | TS type      | Notes                                       |
| ---------------- | ---------- | ------------ | ------------------------------------------- |
| `t.bool`         | 1          | `boolean`    |                                             |
| `t.i8` / `t.u8`  | 1          | `number`     |                                             |
| `t.i16` / `t.u16`| 2          | `number`     | big-endian                                  |
| `t.i32` / `t.u32`| 4          | `number`     | big-endian                                  |
| `t.f32` / `t.f64`| 4 / 8      | `number`     | big-endian                                  |
| `t.i64` / `t.u64`| 8          | `bigint`     | big-endian                                  |
| `t.string`       | 2 + utf-8  | `string`     | uint16 length prefix, max 65535 utf-8 bytes |
| `t.shortBytes`   | 2 + n      | `Uint8Array` | uint16 length prefix, max 65535 bytes       |
| `t.bytes`        | 4 + n      | `Uint8Array` | uint32 length prefix, max 4294967295 bytes  |

Little-endian variants live under `t.le.*` (e.g. `t.le.u32`, `t.le.f64`, `t.le.string`).

### Schema shape

A schema is one of:

- A codec token (`t.u32`).
- A single-element array `[Schema]` — encodes as a uint16 length prefix followed by N child encodings.
- A plain object — fields encoded in declared key order.

```ts
type Schema = Codec<unknown> | Schema[] | { [k: string]: Schema };
type Infer<S> = /* recursively maps each leaf to its TS type */;
```

### Functions

```ts
struct<S extends Schema>(schema: S): {
  schema: S;
  encode(value: Infer<S>): Buffer;
  decode(input: Uint8Array): Infer<S>;
  sizeOf(value: Infer<S>): number;
};

encode<S extends Schema>(value: Infer<S>, schema: S): Buffer;
decode<S extends Schema>(input: Uint8Array, schema: S): Infer<S>;
```

`struct(schema)` compiles the schema tree once and reuses the compiled codec across calls — prefer it in hot paths.

### Errors

Validation throws `DataStructError` with a `code`:

| Code                  | When                                              |
| --------------------- | ------------------------------------------------- |
| `VALUE_OUT_OF_RANGE`  | Numeric value outside the leaf's range or non-int |
| `STRING_TOO_LONG`     | UTF-8 byte length exceeds 65535                   |
| `BYTES_TOO_LONG`      | Bytes value exceeds the leaf's length cap         |
| `ARRAY_TOO_LONG`      | Array length exceeds 65535                        |
| `BUFFER_UNDERFLOW`    | Decode would read past the end of the input       |
| `SCHEMA_MISMATCH`     | Value shape does not match the schema             |
| `INVALID_SCHEMA`      | Schema itself is malformed                        |

Every error carries `path` (e.g. `$.skills[1].description`) and, for decode errors, `offset`.

## Wire format

```
bool          : 1 byte               0x00 = false, anything else = true
i8/u8         : 1 byte
i16/u16       : 2 bytes BE
i32/u32       : 4 bytes BE
f32/f64       : 4 / 8 bytes BE
i64/u64       : 8 bytes BE
string        : uint16 BE length || utf-8 bytes
shortBytes    : uint16 BE length || raw bytes
bytes         : uint32 BE length || raw bytes
array [E]     : uint16 BE length || N encoded elements
object {…}    : fields encoded in declared key order, no header
```

LE variants (`t.le.*`) swap the byte order of length prefixes and the numeric payload.

## Migration from `0.0.x`

The 0.1.0 release is a full rewrite with a new API surface. The wire format is preserved, so buffers produced by older versions decode correctly under the new codecs.

| Old                       | New                       |
| ------------------------- | ------------------------- |
| `DataTypes.boolean`       | `t.bool`                  |
| `DataTypes.int8` / `uint8`| `t.i8` / `t.u8`           |
| `DataTypes.int16`/`uint16`| `t.i16` / `t.u16`         |
| `DataTypes.int32`/`uint32`| `t.i32` / `t.u32`         |
| `DataTypes.float`         | `t.f32`                   |
| `DataTypes.double`        | `t.f64`                   |
| `DataTypes.string`        | `t.string`                |
| `DataTypes.shortBuffer`   | `t.shortBytes`            |
| `DataTypes.buffer`        | `t.bytes`                 |
| `DataWriter(obj, scheme)` | `encode(obj, schema)`     |
| `DataReader(buf, scheme)` | `decode(buf, schema)`     |

The legacy `DataTypes` / `DataReader` / `DataWriter` exports are removed.

## Development

```sh
npm install
npm run typecheck
npm run lint
npm test
npm run bench
npm run build
```

## License

MIT
