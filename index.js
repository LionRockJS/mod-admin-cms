import url from "node:url";
const dirname = url.fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
export default {dirname}

import ControllerAdminPage from "./classes/controller/admin/Page.mjs";
import ControllerAdminContent from "./classes/controller/admin/Content.mjs";
import ControllerAdminTag from "./classes/controller/admin/Tag.mjs";
import HelperPageText from "./classes/helper/PageText.mjs";
import ModelPage from "./classes/model/Page.mjs";
import ModelTag from "./classes/model/Tag.mjs";
import ModelTagType from "./classes/model/TagType.mjs";

export {
  ControllerAdminPage,
  ControllerAdminContent,
  ControllerAdminTag,
  HelperPageText,
  ModelPage,
  ModelTag,
  ModelTagType,
};
