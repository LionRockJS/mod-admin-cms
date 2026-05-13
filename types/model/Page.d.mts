import { Model } from '@lionrockjs/central';
export default class Page extends Model {
    name: any;
    slug: any;
    weight: number;
    start: any;
    end: any;
    page_type: any;
    current_page_version_id: any;
    original: any;
    static joinTablePrefix: string;
    static tableName: string;
    static fields: Map<string, string>;
    static belongsTo: Map<unknown, unknown>;
    static hasMany: string[][];
}
