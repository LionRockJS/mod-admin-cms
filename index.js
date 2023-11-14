require('kohanajs').addNodeModule(__dirname);

const ControllerAdminPage = require('./classes/controller/admin/Page');
const ControllerAdminContent = require('./classes/controller/admin/Content');
const ControllerAdminTag = require('./classes/controller/admin/Tag');
const HelperPageText = require('./classes/helper/PageText');

module.exports = {
  ControllerAdminPage,
  ControllerAdminContent,
  ControllerAdminTag,
  HelperPageText,
};
