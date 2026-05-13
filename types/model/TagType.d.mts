import { Model } from '@lionrockjs/central';
export default class TagType extends Model {
    name: any;
    static joinTablePrefix: string;
    static tableName: string;
    static fields: Map<string, string>;
    static hasMany: [string, string][];
}
