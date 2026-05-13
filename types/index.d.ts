declare const _default: {
    configs: {
        cms: {
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
    };
};
export default _default;
import ControllerAdminPageAPI from "./controller/admin/API.mjs";
import ControllerAdminPage from "./controller/admin/Page.mjs";
import ControllerAdminTag from "./controller/admin/Tag.mjs";
import ModelPage from "./model/Page.mjs";
import ModelTag from "./model/Tag.mjs";
import ModelPageTag from "./model/PageTag.mjs";
import ModelTagType from "./model/TagType.mjs";
export { ControllerAdminPageAPI, ControllerAdminPage, ControllerAdminTag, ModelPage, ModelPageTag, ModelTag, ModelTagType, };
