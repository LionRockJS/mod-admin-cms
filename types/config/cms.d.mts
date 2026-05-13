declare const _default: {
    uploadRoles: string[];
    timezone: string;
    landing: string;
    databaseMap: Map<string, string>;
    versionPath: string;
    defaultLanguage: string;
    languages: string[];
    blueprint: {
        default: (string | {
            items: string[];
        })[];
        contact: (string | {
            position: string[];
        })[];
        company: string[];
    };
    blocks: {
        default: (string | {
            items: string[];
        })[];
        label: string[];
        logos: (string | {
            pictures: string[];
        })[];
        paragraphs: string[];
    };
    pageTypeSlugs: {
        default: string[];
    };
    blockLists: {
        default: string[];
    };
    tagLists: {
        default: string[];
    };
};
export default _default;
