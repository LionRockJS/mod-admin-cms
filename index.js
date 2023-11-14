import url from "node:url";
const dirname = url.fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
export default {dirname}

import ControllerAdminPage from "./classes/controller/admin/Page";
import ControllerAdminContent from "./classes/controller/admin/Content";
import ControllerAdminTag from "./classes/controller/admin/Tag";
import HelperPageText from "./classes/helper/PageText";

export {
  ControllerAdminPage,
  ControllerAdminContent,
  ControllerAdminTag,
  HelperPageText,
};
