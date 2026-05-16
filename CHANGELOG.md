# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-16

### Added
- Full TypeScript rewrite.
- New codec-token API: `t.bool`, `t.i8/u8/i16/u16/i32/u32`, `t.f32/f64`, `t.i64/u64`, `t.string`, `t.shortBytes`, `t.bytes`.
- Little-endian variants under `t.le.*`.
- `struct(schema)` factory that compiles a schema once and reuses it across `encode`/`decode`/`sizeOf` calls.
- Functional `encode(value, schema)` and `decode(buf, schema)`.
- `Infer<S>` type helper that derives the TypeScript shape of decoded values from a schema.
- `DataStructError` with codes (`VALUE_OUT_OF_RANGE`, `STRING_TOO_LONG`, `BYTES_TOO_LONG`, `ARRAY_TOO_LONG`, `BUFFER_UNDERFLOW`, `SCHEMA_MISMATCH`, `INVALID_SCHEMA`), `path` (e.g. `$.skills[1].description`), and `offset` (for decode errors).
- Dual ESM + CommonJS build with separate `.d.mts` / `.d.cts` type declarations.
- Vitest test suite (wire-format goldens, roundtrip, error paths) with v8 coverage.
- `tinybench`-based benchmark suite.
- GitHub Actions: CI matrix (Node 20/22/24 on Linux + Node 22 on macOS/Windows), on-demand benchmark workflow, tag-triggered release with npm provenance.
- Dependabot, PR template, CODEOWNERS.

### Changed
- Module format: package is now `"type": "module"`; entry points are `dist/index.mjs` (ESM) and `dist/index.cjs` (CJS).
- Minimum Node.js version: `>=20.9`.
- Encoder now allocates the output `Buffer` exactly once via a two-pass measure/write strategy (no `Buffer.concat`).
- Decoded `shortBytes` / `bytes` are returned as independent copies of the source memory rather than aliased views.
- Replaced deprecated `new Buffer(...)` calls with `Buffer.allocUnsafe` (for output) and `TextEncoder`/`TextDecoder` for string codecs.

### Removed
- Legacy exports `DataTypes`, `DataReader`, `DataWriter` (clean break — see README migration table).
- `grunt`, `grunt-simple-mocha`, `jit-grunt`, `grunt-contrib-jshint`, `chai`, `benchmark`.

### Wire format
- **Byte-identical** with `0.0.x` for the corresponding new codecs. The previous test suite's golden buffers are preserved as goldens in `test/wire-format.test.ts`.
