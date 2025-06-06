export default {
  filename: import.meta.url,
  configs: ['cms']
}

import ControllerAdminPageAPI from "./classes/controller/admin/API.mjs";
import ControllerAdminPage from "./classes/controller/admin/Page.mjs";
import ControllerAdminTag from "./classes/controller/admin/Tag.mjs";
import ModelPage from "./classes/model/Page.mjs";
import ModelTag from "./classes/model/Tag.mjs";
import ModelPageTag from "./classes/model/PageTag.mjs";
import ModelTagType from "./classes/model/TagType.mjs";

export {
  ControllerAdminPageAPI,
  ControllerAdminPage,
  ControllerAdminTag,
  ModelPage,
  ModelPageTag,
  ModelTag,
  ModelTagType,
};
