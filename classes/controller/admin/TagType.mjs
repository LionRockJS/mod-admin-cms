import { Central, ORM} from '@lionrockjs/central';
import { ControllerAdmin } from '@lionrockjs/mod-admin';

import DefaultTagType from '../../model/TagType.mjs';
const TagType = await ORM.import('TagType', DefaultTagType);

export default class ControllerTagType extends ControllerAdmin{
  constructor(request){
    super(request, TagType, {
      databases: new Map([
        ['tag', Central.config.cms.databaseMap.get('tag')],        
      ]),
      database: 'tag',
      limit: 99999,
      templates: new Map([
        ['index', 'templates/admin/tag_types/index'],
        ['create', 'templates/admin/tag_types/edit'],
        ['edit', 'templates/admin/tag_types/edit'],
        ['read', 'templates/admin/tag_types/edit'],
      ]),
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