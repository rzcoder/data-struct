import { Bench } from 'tinybench';
import { decode, encode, struct, t } from '../src/index.js';
import type { Schema } from '../src/index.js';

interface Scenario {
  readonly name: string;
  readonly schema: Schema;
  readonly value: unknown;
}

const scenarios: Scenario[] = [
  { name: 'i32', schema: t.i32, value: 0x0f00ff00 },
  { name: 'string', schema: t.string, value: 'Hello I String' },
  {
    name: 'nested',
    schema: { nested: { nested2: { nested3: { nested4: { nested5: t.u8 } } } } },
    value: { nested: { nested2: { nested3: { nested4: { nested5: 42 } } } } },
  },
  {
    name: 'list of list',
    schema: [[t.i16]],
    value: [
      [90, 10, 101],
      [20, 30, 400],
      [100, 110, 1],
    ],
  },
  {
    name: 'hero (struct factory)',
    schema: {
      id: t.u32,
      name: t.string,
      hp: t.i16,
      skills: [{ id: t.u16, description: t.string }],
      playable: t.bool,
      experience: t.u32,
      position: { x: t.u16, y: t.u16 },
    },
    value: {
      id: 9,
      name: 'CirnoBaka',
      hp: 146,
      skills: [
        { id: 34, description: 'freezing frogs' },
        { id: 16, description: 'perfect math' },
      ],
      playable: false,
      experience: 99999999,
      position: { x: 2, y: 3 },
    },
  },
];

async function main(): Promise<void> {
  const bench = new Bench({ time: 500 });

  for (const scenario of scenarios) {
    const codec = struct(scenario.schema);
    const buffer = encode(scenario.value as never, scenario.schema);

    bench
      .add(`${scenario.name} :: encode (loose)`, () => {
        encode(scenario.value as never, scenario.schema);
      })
      .add(`${scenario.name} :: encode (compiled struct)`, () => {
        codec.encode(scenario.value as never);
      })
      .add(`${scenario.name} :: decode (loose)`, () => {
        decode(buffer, scenario.schema);
      })
      .add(`${scenario.name} :: decode (compiled struct)`, () => {
        codec.decode(buffer);
      });
  }

  await bench.run();

  console.log('\n=== data-struct benchmark ===');
  console.table(
    bench.tasks.map((task) => ({
      task: task.name,
      'ops/sec': task.result?.hz.toFixed(0),
      'avg (ns)': task.result?.mean ? (task.result.mean * 1e6).toFixed(2) : '—',
      samples: task.result?.samples.length,
    })),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
