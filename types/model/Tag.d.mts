import { Model } from '@lionrockjs/central';
export default class Tag extends Model {
    tag_type_id: any;
    parent_tag: any;
    name: any;
    original: any;
    static joinTablePrefix: string;
    static tableName: string;
    static fields: Map<string, string>;
    static belongsTo: Map<string, string>;
    static hasMany: string[][];
}
