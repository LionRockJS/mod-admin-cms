import { Central } from '@lionrockjs/central';

await Central.initConfig(new Map([
  ['cms', await import('./config/cms.mjs')],
]));