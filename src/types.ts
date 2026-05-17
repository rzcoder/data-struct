declare const phantom: unique symbol;

export interface EncodePlan {
  strings: Uint8Array[];
  cursor: number;
}

export interface ReadResult<T> {
  value: T;
  offset: number;
}

export interface CodecImpl<T> {
  measure(value: T, plan: EncodePlan, path: string): number;
  write(
    view: DataView,
    bytes: Uint8Array,
    offset: number,
    value: T,
    plan: EncodePlan,
    path: string,
  ): number;
  read(view: DataView, bytes: Uint8Array, offset: number, path: string): ReadResult<T>;
}

export interface Codec<T> {
  readonly tag: number;
  /** Wire size in bytes if fixed, or null for variable-length codecs. */
  readonly size: number | null;
  readonly impl: CodecImpl<T>;
  readonly [phantom]?: T;
}

// biome-ignore lint/suspicious/noExplicitAny: top type for schema discriminator
export type AnyCodec = Codec<any>;

export type Schema = AnyCodec | readonly Schema[] | { readonly [key: string]: Schema };

export type Infer<S> = S extends Codec<infer T>
  ? T
  : S extends readonly (infer E)[]
    ? E extends Schema
      ? Infer<E>[]
      : never
    : S extends { readonly [key: string]: Schema }
      ? { -readonly [K in keyof S]: Infer<S[K]> }
      : never;
