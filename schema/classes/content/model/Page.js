const {ORM} = require('kohanajs');

class Page extends ORM{
  name = null;
  slug = null;
  weight = 5;
  start = null;
  end = null;
  page_type = null;
  current_page_version_id = null;
  original = null;

  static joinTablePrefix = 'page';
  static tableName = 'pages';

  static fields = new Map([
    ["name", "String!"],
    ["slug", "String!"],
    ["weight", "Int"],
    ["start", "Date"],
    ["end", "Date"],
    ["page_type", "String"],
    ["current_page_version_id", "Int"],
    ["original", "String"]
  ]);
  static hasMany = [
    ["page_id", "PageTag"],
    ["page_id", "PageKeyword"]
  ];
}

module.exports = Page;
