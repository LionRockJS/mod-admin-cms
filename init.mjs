import { Central } from '@lionrockjs/central';

Central.initConfig(new Map([
  ['cms', await import('./config/cms.mjs')],
]));