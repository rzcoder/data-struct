import { struct, t } from '../src/index.js';
import type { Infer } from '../src/index.js';

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

const cirno: Hero = {
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
};

const buf = Hero.encode(cirno);
const decoded = Hero.decode(buf);

console.log(`encoded ${buf.byteLength} bytes:`, buf.toString('hex'));
console.log('decoded hero  :', decoded);
console.log('roundtrip eq  :', JSON.stringify(cirno) === JSON.stringify(decoded));
