const {ORM} = require('kohanajs');

class PageKeyword extends ORM{
  page_id = null;
  language_code = null;
  name = null;
  keywords = null;

  static joinTablePrefix = 'page_keyword';
  static tableName = 'page_keywords';

  static fields = new Map([
    ["language_code", "String!"],
    ["name", "String!"],
    ["keywords", "String!"]
  ]);
  static belongsTo = new Map([
    ["page_id", "Page"]
  ]);
}

module.exports = PageKeyword;
