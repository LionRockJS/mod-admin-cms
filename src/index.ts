export default {
  filename: import.meta.url,
  configs: ['cms']
}

import ControllerAdminPageAPI from "./controller/admin/API.mjs";
import ControllerAdminPage from "./controller/admin/Page.mjs";
import ControllerAdminTag from "./controller/admin/Tag.mjs";
import ModelPage from "./model/Page.mjs";
import ModelTag from "./model/Tag.mjs";
import ModelPageTag from "./model/PageTag.mjs";
import ModelTagType from "./model/TagType.mjs";

export {
  ControllerAdminPageAPI,
  ControllerAdminPage,
  ControllerAdminTag,
  ModelPage,
  ModelPageTag,
  ModelTag,
  ModelTagType,
};
