import path from 'node:path';
import { build } from '@lionrockjs/start';

build(
  `${__dirname}/content.graphql`,
  ``,
  `${__dirname}/exports/content.sql`,
  `${__dirname}/default/db/www/content.sqlite`,
  path.normalize(`${__dirname}/classes/content/model`)
);

build(
  `${__dirname}/content.graphql`,
  ``,
  `${__dirname}/exports/content-draft.sql`,
  `${__dirname}/default/db/content.sqlite`,
  path.normalize(`${__dirname}/classes/contentDraft/model`)
);

build(
  `${__dirname}/tag.graphql`,
  ``,
  `${__dirname}/exports/tag.sql`,
  `${__dirname}/default/db/www/tag.sqlite`,
  path.normalize(`${__dirname}/classes/tag/model`)
);