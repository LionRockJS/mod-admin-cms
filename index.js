export default {
  filename: import.meta.url,
  configs: ['cms']
}

import ControllerAdminPage from "./classes/controller/admin/Page.mjs";
import ControllerAdminTag from "./classes/controller/admin/Tag.mjs";
import HelperPageText from "./classes/helper/PageText.mjs";
import ModelPage from "./classes/model/Page.mjs";
import ModelTag from "./classes/model/Tag.mjs";
import ModelPageTag from "./classes/model/PageTag.mjs";
import ModelTagType from "./classes/model/TagType.mjs";

export {
  ControllerAdminPage,
  ControllerAdminTag,
  HelperPageText,
  ModelPage,
  ModelPageTag,
  ModelTag,
  ModelTagType,
};
