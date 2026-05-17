import { DataStructError, decode, encode, t } from '../src/index.js';

function runCase(label: string, fn: () => unknown): void {
  try {
    fn();
    console.log(`[${label}] no error — unexpected`);
  } catch (err) {
    if (!(err instanceof DataStructError)) throw err;
    const offset = err.offset !== undefined ? ` offset=${err.offset}` : '';
    console.log(`[${label}] code=${err.code} path=${err.path}${offset} :: ${err.message}`);
  }
}

// Numeric value outside the leaf's range.
runCase('VALUE_OUT_OF_RANGE', () => encode(300, t.u8));

// UTF-8 byte length exceeds the 65535-byte string limit.
runCase('STRING_TOO_LONG', () => encode('a'.repeat(65_536), t.string));

// Array length exceeds the 65535-element limit.
runCase('ARRAY_TOO_LONG', () => encode(new Array<number>(65_536).fill(0), [t.u8]));

// Value shape does not match the schema (name should be a string).
const Person = { id: t.u32, name: t.string };
type PersonValue = { id: number; name: string };
runCase('SCHEMA_MISMATCH', () => encode({ id: 1, name: 42 } as unknown as PersonValue, Person));

// Decode would read past the end of the input — length prefix says 5, only 2 follow.
runCase('BUFFER_UNDERFLOW', () => decode(new Uint8Array([0x00, 0x05, 0x68, 0x65]), t.string));
