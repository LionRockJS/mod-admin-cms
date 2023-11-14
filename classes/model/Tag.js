const {ORM} = require('kohanajs');

class Tag extends ORM{
  tag_type_id = null;
  parent_tag = null;
  name = null;
  original = null;

  static joinTablePrefix = 'tag';
  static tableName = 'tags';

  static fields = new Map([
    ["name", "String!"],
    ["original", "String"]
  ]);
  static belongsTo = new Map([
    ["tag_type_id", "TagType"],
    ["parent_tag", "Tag"]
  ]);
  static hasMany = [
    ["parent_tag", "Tag"]
  ];
}

module.exports = Tag;
