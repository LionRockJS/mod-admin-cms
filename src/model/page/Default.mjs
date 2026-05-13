import { Model } from '@lionrockjs/central';

export default class Default extends Model{
  date = null;

  static joinTablePrefix = 'default';
  static tableName = 'defaults';

  static fields = new Map([
    ["date", "Date"]
  ]);
}
