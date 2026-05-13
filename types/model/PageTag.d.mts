import { Model } from '@lionrockjs/central';
export default class PageTag extends Model {
    page_id: any;
    tag_id: any;
    weight: number;
    static joinTablePrefix: string;
    static tableName: string;
    static fields: Map<string, string>;
    static belongsTo: Map<string, string>;
}
