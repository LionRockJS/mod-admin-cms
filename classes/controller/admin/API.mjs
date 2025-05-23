import {Controller, ControllerMixinDatabase, Central, ORM} from '@lionrockjs/central';
import {ControllerAdmin} from '@lionrockjs/mod-admin';
import {HelperPageText} from "@lionrockjs/mod-cms-read";

import DefaultPage from '../../model/Page.mjs';
import DefaultPageTag from '../../model/PageTag.mjs';
import DefaultTagType from '../../model/TagType.mjs';

const Page = await ORM.import('Page', DefaultPage);
const PageTag = await ORM.import('PageTag', DefaultPageTag);
const TagType = await ORM.import('TagType', DefaultTagType);

export default class ControllerAPI extends ControllerAdmin{
  constructor(request){
    super(request, Page, {
      roles: new Set(['admin', 'staff']),
      databases: new Map([
        ['draft', `${Central.config.cms.databasePath}/content.sqlite`],
        ['tag', `${Central.config.cms.databasePath}/www/tag.sqlite`],
      ]),
      database: 'draft',
    });

    this.state.get(Controller.STATE_HEADERS)['Content-Type'] = 'application/json';
  }

  async action_pages(){
    const {type} = this.state.get(Controller.STATE_PARAMS);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');

    const pages = await ORM.readBy(Page, 'page_type', [type], {database, asArray:true, limit:999999});
    this.state.set(Controller.STATE_BODY, pages.map(page => ({
      page: page.id,
      name: page.name,
    })));
  }

  async action_tags(){
    const {type} = this.state.get(Controller.STATE_PARAMS);

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('tag');
    const tagType = await ORM.readBy(TagType, 'name', [type], {database, asArray:false, limit: 1});
    if(!tagType){
      this.state.set(Controller.STATE_BODY, []);
      return;
    }

    await tagType.eagerLoad({with: ['Tag']}, {database});

    this.state.set(Controller.STATE_BODY, tagType.tags.map(tag => {
      const print = HelperPageText.originalToPrint(
        HelperPageText.getOriginal(tag),
        this.state.get(Controller.STATE_LANGUAGE),
        Central.config.cms.defaultLanguage
      );

      return {
        value: tag.id,
        label: print.tokens.name || tag.name,
      }
    }));
  }

  async action_add_page_tag(){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const {page_id, tag_id} = this.state.get(Controller.STATE_PARAMS);
    //check page tag exist
    const exist = await ORM.readWith(PageTag, [['', 'page_id', 'EQUAL', page_id], ['AND', 'tag_id', 'EQUAL', tag_id]], {database, limit: 1, asArray:false});
    if(exist){
      this.state.set(Controller.STATE_BODY,{
        type: 'ADD_PAGE_TAG',
        payload: {
          success: false,
          message: "tag exist",
          id: exist.id,
        }
      });
      return;
    }

    const pageTag = ORM.create(PageTag, {database});
    Object.assign(pageTag, {page_id, tag_id});
    await pageTag.write();

    //update page timestamp
    const page = await ORM.factory(Page, page_id, {database});
    await page.write();

    this.state.set(Controller.STATE_BODY,{
      type: 'ADD_PAGE_TAG',
      payload: {
        success: true,
        id: pageTag.id,
      }
    });
  }

  async action_delete_page_tag(){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const {id} = this.state.get(Controller.STATE_PARAMS);
    const pageTag = await ORM.factory(PageTag, id, {database});
    const page_id = pageTag.page_id;

    await pageTag.delete();

    const page = await ORM.factory(Page, page_id, {database});
    await page.write();

    this.state.set(Controller.STATE_BODY, {
      type: 'DELETE_PAGE_TAG',
      payload: {
        success: true,
        id: id,
      }
    });
  }
}