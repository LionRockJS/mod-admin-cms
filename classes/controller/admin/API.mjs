const {SQL} = require('@kohanajs/constants');
const {ControllerMixinDatabase, KohanaJS, ORM} = require("kohanajs");
const {ControllerAdmin} = require("@kohanajs/mod-admin");

const HelperPageText = require('../../helper/PageText');
const Page = ORM.require('Page');
const PageTag = ORM.require('PageTag');
const TagType = ORM.require('TagType');

class ControllerAPI extends ControllerAdmin{
  constructor(request){
    super(request, Page, {
      roles: new Set(['admin', 'staff']),
      databases: new Map([
        ['draft', `${KohanaJS.config.cms.databasePath}/content.sqlite`],
        ['tag', `${KohanaJS.config.cms.databasePath}/www/tag.sqlite`],
      ]),
      database: 'draft',
    });

    this.headers['Content-Type'] = 'application/json';
  }

  async action_pages(){
    const {type} = this.request.params;
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');

    const pages = await ORM.readBy(Page, 'page_type', [type], {database, asArray:true, limit:999999});
    this.body = pages.map(page => ({
      page: page.id,
      name: page.name,
    }));
  }

  async action_tags(){
    const {type} = this.request.params;

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('tag');
    const tagType = await ORM.readBy(TagType, 'name', [type], {database, asArray:false, limit: 1});
    if(!tagType){
      this.body = [];
      return;
    }

    await tagType.eagerLoad({with: ['Tag']}, {database});

    this.body = tagType.tags.map(tag => {
      const print = HelperPageText.originalToPrint(HelperPageText.getOriginal(tag), this.language, KohanaJS.config.cms.defaultLanguage);

      return {
        value: tag.id,
        label: print.tokens.name || tag.name,
      }
    });
  }

  async action_add_page_tag(){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');

    const {page_id, tag_id} = this.request.params;
    //check page tag exist
    const exist = await ORM.readWith(PageTag, [['', 'page_id', SQL.EQUAL, page_id], [SQL.AND, 'tag_id', SQL.EQUAL, tag_id]], {database, limit: 1, asArray:false});
    if(exist){
      this.body = {
        type: 'ADD_PAGE_TAG',
        payload: {
          success: false,
          message: "tag exist",
          id: exist.id,
        }
      }
      return;
    }

    const pageTag = ORM.create(PageTag, {database});
    Object.assign(pageTag, {page_id, tag_id});
    await pageTag.write();

    //update page timestamp
    const page = await ORM.factory(Page, page_id, {database});
    await page.write();

    this.body = {
      type: 'ADD_PAGE_TAG',
      payload: {
        success: true,
        id: pageTag.id,
      }
    }
  }

  async action_delete_page_tag(){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const {id} = this.request.params;
    const pageTag = await ORM.factory(PageTag, id, {database});
    const page_id = pageTag.page_id;

    await pageTag.delete();

    const page = await ORM.factory(Page, page_id, {database});
    await page.write();

    this.body = {
      type: 'DELETE_PAGE_TAG',
      payload: {
        success: true,
        id: id,
      }
    }
  }
}

module.exports = ControllerAPI;
