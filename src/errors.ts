export type DataStructErrorCode =
  | 'VALUE_OUT_OF_RANGE'
  | 'STRING_TOO_LONG'
  | 'BYTES_TOO_LONG'
  | 'ARRAY_TOO_LONG'
  | 'BUFFER_UNDERFLOW'
  | 'SCHEMA_MISMATCH'
  | 'INVALID_SCHEMA';

export interface DataStructErrorOptions {
  path?: string;
  offset?: number;
  cause?: unknown;
}

export class DataStructError extends Error {
  readonly code: DataStructErrorCode;
  readonly path: string;
  readonly offset: number | undefined;

  constructor(code: DataStructErrorCode, message: string, opts: DataStructErrorOptions = {}) {
    super(opts.path ? `${message} at ${opts.path}` : message, { cause: opts.cause });
    this.name = 'DataStructError';
    this.code = code;
    this.path = opts.path ?? '$';
    this.offset = opts.offset;
  }
}
