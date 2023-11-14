import { ORM } from '@lionrockjs/central';

export default class PageTag extends ORM{
  page_id = null;
  tag_id = null;
  weight = 5;

  static joinTablePrefix = 'page_tag';
  static tableName = 'page_tags';

  static fields = new Map([
    ["tag_id", "Int!"],
    ["weight", "Int"]
  ]);
  static belongsTo = new Map([
    ["page_id", "Page"]
  ]);
}

module.exports = PageTag;
