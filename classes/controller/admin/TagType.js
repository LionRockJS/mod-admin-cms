const {KohanaJS, ORM} = require("kohanajs");
const {ControllerAdmin} = require("@kohanajs/mod-admin");

const TagType = ORM.require('TagType');

class ControllerTagType extends ControllerAdmin{
  constructor(request){
    super(request, TagType, {
      databases: new Map([
        ['tag',   `${KohanaJS.config.cms.databasePath}/www/tag.sqlite`],
      ]),
      database: 'tag',
      limit: 99999,
    });
  }

  async action_read(){
    const instance = this.state.get('instance');
    await instance.eagerLoad({
      with: ['Tag'],
      tags: null
    })
  }
}

module.exports = ControllerTagType;