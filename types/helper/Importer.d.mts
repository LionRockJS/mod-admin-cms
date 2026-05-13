export default class HelperImporter {
    static ACTION_NEW_ONLY: string;
    static ACTION_APPEND_ONLY: string;
    static ACTION_NEW_AND_APPEND: string;
    static ACTION_OVERWRITE: string;
    static ACTION_FORCE_NEW: string;
    static getUpdateSummary(safeFields: any, conflictFields?: any, tagComparison?: any): string;
    static validateFile(file: any, database: any, uniqueDigestHandler?: (item: any, digest: any) => void, findExistingRecord?: (item: any, database: any) => Promise<any>, configImporter?: {
        attributes: any[];
        values: {};
        items: any[];
        tags: any[];
    }): Promise<{
        headers: any;
        objects: any;
        duplicatedObjects: any[];
        duplicatedRow: any[];
        conflictedObjects: any[];
        importObjects: any[];
        duplicated: any[];
        added: any[];
        safeImportAnalysis: any[];
        configImporter: {
            attributes: any[];
            values: {};
            items: any[];
            tags: any[];
        };
    }>;
    static assignAttributes(original: any, item: any, keys: any, shouldTrim?: boolean): void;
    static assignValues(original: any, item: any, keys: any, shouldTrim?: boolean, fallback?: string): void;
    static recursiveDeepCopy(o: any): any;
    static assignItems(original: any, item: any, configs: any, shouldTrim?: boolean, fallback?: string): void;
    static compareItems(obj1: any, obj2: any): boolean;
    static importFile(file: any, database: any, Model: any, configImporter?: {
        attributes: any[];
        values: {};
        items: any[];
    }, validateFile?: typeof HelperImporter.validateFile, findExistingRecord?: (item: any, database: any) => Promise<void>, handler?: (original: any, item: any, autoId: any) => Promise<void>, action?: string): Promise<void>;
    static findSafeImportFields(databaseRecord: any, excelData: any, configImporter?: {
        attributes: any[];
        values: {};
        items: any[];
    }): {
        attributes: any[];
        values: {};
        items: {};
    };
    static findConflictImportFields(databaseRecord: any, excelData: any, configImporter?: {
        attributes: any[];
        values: {};
        items: any[];
    }): {
        attributes: any[];
        values: {};
        items: {};
    };
    static isEmpty(value: any): boolean;
    static valuesAreEqual(dbValue: any, excelValue: any): boolean;
    /**
     * Compare tags from Excel with existing database tags to determine if they can be safely appended or if there are conflicts
     * @param {Object} databaseRecord - The existing database record (with tags grouped by type)
     * @param {Object} excelData - The Excel data row
     * @param {Array} tagMappings - Tag mapping configuration from importer config (e.g., [['excel_field', 'tag_type_name']])
     * @returns {Object} Object with safeToAppend and conflicts arrays
     */
    static compareTagsWithDatabase(databaseRecord: any, excelData: any, tagMappings: any): {
        safeToAppend: any[];
        conflicts: any[];
    };
}
