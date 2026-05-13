import { Model } from '@lionrockjs/central';
export default class Default extends Model {
    date: any;
    static joinTablePrefix: string;
    static tableName: string;
    static fields: Map<string, string>;
}
