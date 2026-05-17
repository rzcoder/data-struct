# examples

Runnable demos of the `data-struct` API. Each file is self-contained — run any of them with:

```sh
npx tsx examples/01-basics.ts
```

| File | Shows |
| --- | --- |
| [01-basics.ts](01-basics.ts) | Primitive codecs (`t.u32`, `t.string`, `t.bool`) and a small `struct({...})` roundtrip. |
| [02-hero.ts](02-hero.ts) | Nested object + array of objects, with the decoded value typed via `Infer<typeof Hero.schema>`. |
| [03-functional.ts](03-functional.ts) | Top-level `encode` / `decode` for one-shot use, without keeping a compiled struct. |
| [04-errors.ts](04-errors.ts) | Each `DataStructError` kind triggered and inspected (`code`, `path`, `offset`). |
| [05-little-endian.ts](05-little-endian.ts) | `t.le.*` variants and how the bytes differ from the big-endian default. |
| [06-size-of.ts](06-size-of.ts) | `sizeOf()` for pre-budgeting buffer sizes. |

Examples import from `../src/index.js` so they work against the in-repo source. In your own project, swap that for:

```ts
import { struct, t } from 'data-struct';
```
