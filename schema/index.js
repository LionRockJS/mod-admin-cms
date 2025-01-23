import path from 'node:path';
import { build } from '@lionrockjs/start';

const __dirname = path.dirname(import.meta.url).replace("file://", "");

build(
  __dirname,
  '',
  `content`,
  '',
  false,
  false
);

build(
  __dirname,
  '',
  'content',
  'www',
);

build(
  __dirname,
  '',
  'tag',
  'www',
);