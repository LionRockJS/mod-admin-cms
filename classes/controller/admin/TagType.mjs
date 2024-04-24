import { Central } from '@lionrockjs/central';
import { ControllerAdmin } from '@lionrockjs/mod-admin';

import TagType from "../../model/TagType.mjs";

export default class ControllerTagType extends ControllerAdmin{
  constructor(request){
    super(request, TagType, {
      databases: new Map([
        ['tag',   `${Central.config.cms.databasePath}/www/tag.sqlite`],
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