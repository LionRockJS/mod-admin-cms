import { Central, ORM} from '@lionrockjs/central';
import { ControllerAdmin } from '@lionrockjs/mod-admin';

import DefaultTagType from '../../model/TagType.mjs';
const TagType = await ORM.import('TagType', DefaultTagType);

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