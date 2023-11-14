const {ORM} = require('kohanajs');

class TagType extends ORM{
  name = null;

  static joinTablePrefix = 'tag_type';
  static tableName = 'tag_types';

  static fields = new Map([
    ["name", "String!"]
  ]);
  static hasMany = [
    ["tag_type_id", "Tag"]
  ];
}

module.exports = TagType;
