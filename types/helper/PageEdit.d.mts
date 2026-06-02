export default class HelperPageEdit {
    static getProps(rawKey: any, prefix?: string): {
        name: any;
        type: any;
    };
    static getPointerProps(rawKey: any): {
        name: any;
        type: any;
    };
    static get_blueprint_props(config_blueprint: any): {
        attributes: any[];
        pointers: any[];
        fields: any[];
        items: any[];
    };
    static definitionInstance(definitions?: any[]): {};
    static blueprint(pageType: any, blueprints?: Record<string, any>, defaultLanguage?: string): {
        items: {};
        attributes: {};
        pointers: {};
        values: {};
    };
    static postToOriginal($_POST: any, langauge?: string): {
        items: {};
        attributes: {};
        pointers: {};
        values: {};
    };
    /**
     * Merges two original objects by combining their properties
     */
    static mergeOriginals(target: any, source: any): {
        items: {};
        attributes: {};
        pointers: {};
        values: {};
    };
    static getOriginal(page: any, attributes?: {}, state?: Map<any, any>): any;
}
