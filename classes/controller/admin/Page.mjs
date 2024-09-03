import { Controller } from '@lionrockjs/mvc';
import { ControllerAdmin } from '@lionrockjs/mod-admin';
import { ControllerMixinDatabase, ControllerMixinView, Central, ORM } from '@lionrockjs/central';
import { ControllerMixinORMDelete } from '@lionrockjs/mixin-orm';
import { ControllerMixinMultipartForm } from '@lionrockjs/mixin-form';
import HelperPageText from "../../helper/PageText.mjs";

import DefaultPage from '../../model/Page.mjs';
import DefaultPageTag from '../../model/PageTag.mjs';
import DefaultTag from '../../model/Tag.mjs';
import DefaultTagType from '../../model/TagType.mjs';

const Page = await ORM.import('Page', DefaultPage);
const PageTag = await ORM.import('PageTag', DefaultPageTag);
const Tag = await ORM.import('Tag', DefaultTag);
const TagType = await ORM.import('TagType', DefaultTagType);

export default class ControllerAdminPage extends ControllerAdmin {
  constructor(request) {
    super(request, Page, {
      roles: new Set(['admin', 'staff']),
      databases: new Map([
        ['draft', `${Central.config.cms.databasePath}/content.sqlite`],
        ['live', `${Central.config.cms.databasePath}/www/content.sqlite`],
        ['tag', `${Central.config.cms.databasePath}/www/tag.sqlite`],
      ]),
      database: 'draft',
    });

    this.state.get(Controller.STATE_HEADERS)['Access-Control-Allow-Origin']  = '*';
    this.state.set(Controller.STATE_LANGUAGE, this.state.get(Controller.STATE_LANGUAGE) || Central.config.cms.defaultLanguage || 'en');
  }

  async publish_weights(){
    const $_POST = this.state.get(ControllerMixinMultipartForm.POST_DATA);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('live');

    const weightMap = new Map();
    Object.keys($_POST).forEach(key => {
      const matches = key.match(/^\((\d+)\):weight$/i);
      if(matches === null)return;
      weightMap.set(matches[1], $_POST[key]);
    });

    const livePages = await ORM.readBy(Page, 'id', [...weightMap.keys()], {database, asArray:true});

    await Promise.all(livePages.map(async page=>{
      const inputWeight = parseInt(weightMap.get(String(page.id)));
      if(page.weight === inputWeight)return;

      page.weight = inputWeight;
      await page.write();
    }));

  }

  async action_update() {
    const $_POST = this.state.get(ControllerMixinMultipartForm.POST_DATA);
    if($_POST.action === 'publish_weights')await this.publish_weights()

    //if no param id, create page proxy
    const instance = this.state.get('instance');
    if(!instance)return;


    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');

    //auto slug
    if($_POST[':slug'] === String(instance.id)){
      const slug = $_POST[':name'].toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const slugExist = await ORM.readBy(Page, 'slug', [slug], {database, asArray:false});
      instance.slug = slugExist ? (slug + instance.id) : slug;
    }

    const original = HelperPageText.getOriginal(instance);
    //update original
    Object.keys($_POST).forEach(name => {
      HelperPageText.update(original, name, $_POST[name], this.state.get(Controller.STATE_LANGUAGE))
    });

    //collect tags and write to original
    await instance.eagerLoad({with:['PageTag']}, {database});

    const databaseTag = this.state.get(ControllerMixinDatabase.DATABASES).get('tag');
    const tagTypes = await ORM.readAll(TagType, {database:databaseTag, asArray:true});
    const tagTypeMap = new Map(tagTypes.map(it => [it.id, it.name]));
    const tags = await ORM.readBy(Tag, 'id', instance.page_tags.map(it => it.tag_id), {database: databaseTag, asArray:true });

    original.tags = tags.map(tag => HelperPageText.getOriginal(tag, {_id: tag.id, _type_id: tag.tag_type_id, _type:tagTypeMap.get(tag.tag_type_id)}));

    instance.original = JSON.stringify(original);
    await instance.write();

    const {session} = this.state.get(Controller.STATE_REQUEST)
    session.autosave = $_POST['autosave'];

    //page start and end should sync with live version
    await this.updateLiveSchedule(instance);

    const action = $_POST['action'] || "";
    const actions = action.split(':');
    const actionType = actions[0];
    const actionParam = actions[1] ?? "";
    const actionParams = actionParam.split('|');

    switch (actionType){
      case "publish":
        await this.publish(instance);
        break;
      case "block-add":
        await this.block_add(instance, $_POST['block-select']);
        break;
      case "block-delete":
        await this.block_delete(instance, actionParam);
        break;
      case "block-item-add":
        await this.block_item_add(instance, actionParams[0], actionParams[1]);
        break;
      case "block-item-delete":
        await this.block_item_delete(instance, actionParams[0], actionParams[1], actionParams[2]);
        break;
      case "item-add":
        await this.item_add(instance, actionParam);
        break;
      case "item-delete":
        await this.item_delete(instance, actionParams[0], actionParams[1]);
        break;
    }

    const destination = $_POST.destination || `/admin/pages/${instance.id}`;
    await this.redirect(destination, !$_POST.destination);
  }

  async updateLiveSchedule(instance){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('live');
    const livePage = await ORM.readBy(Page, 'id', [instance.id], {database, limit: 1, asArray: false});
    if(!livePage)return;
    livePage.start = instance.start;
    livePage.end   = instance.end;
    await livePage.write();
  }

  async unpublish(id){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('live');
    const existPages = await ORM.readBy(Page, 'id', [id], {database, asArray:true});
    if(existPages.length > 0){
      await Promise.all(existPages.map(async it => it.delete()));
    }
  }

  async publish(page){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('live');

    //live database always keep minimal content
    //check page exist, remove it.
    await this.unpublish(page.id, database);

    //create live page with page.id
    const livePage = ORM.create(Page, {database, insertID: page.id});
    Object.assign(livePage, page);
    delete livePage.id;
    await livePage.write();

    //copy page tags
    await page.eagerLoad({with:['PageTag']});
    await Promise.all(page.page_tags.map(async it => {
      const livePageTag = ORM.create(PageTag, {database, insertID: it.id});
      const fields = {...it};
      delete fields.id;
      Object.assign(livePageTag, fields);
      livePageTag.weight = page.weight;
      livePageTag.write();
    }));
  }

  async action_unpublish(){
    const {id} = this.state.get(Controller.STATE_PARAMS)
    await this.unpublish(id);
    await this.redirect(`/admin/pages/${id}`, true);
  }

  setEditTemplate(page, livePage=null, placeholders = {}, tags={}){
    const editTemplateFolder = page.page_type ?? 'default';

    const templateData = this.state.get(ControllerMixinView.TEMPLATE).data;

    //assign item index as item key
    Object.keys(page.print.tokens).forEach(token =>{
      if(Array.isArray(page.print.tokens[token])){
        page.print.tokens[token].forEach((it, i) => {
          if(typeof it !== 'object')return;
          it._weight = parseInt(it._weight)
          it._key = i;
        });
      }
    })

    //assign block index as block key, block item index as block item key
    page.print.blocks.forEach((block, i) =>{
      block._weight = parseInt(block.tokens._weight);
      block._key ||= i;
      Object.keys(block.tokens).forEach(token => {
        if(Array.isArray(block.tokens[token])){
          block.tokens[token].forEach((it, j) => {
            if(it._key) it._key = j
          });
        }
      })
    })

    templateData.tokens       = page.print.tokens;
    templateData.blocks       = page.print.blocks;
    templateData.block_names  = Object.keys(Central.config.cms.blocks) || [];
    templateData.language     = this.state.get(Controller.STATE_LANGUAGE);
    templateData.placeholders = placeholders;
    templateData.autosave     = this.state.get(Controller.STATE_REQUEST).session.autosave;
    templateData.published    = !!livePage;
    templateData.sync         = page.original === livePage?.original && page.slug === livePage.slug;
    templateData.page_type    = page.page_type;
    templateData.tags         = tags;

    const blueprint = Central.config.cms.blueprint[page.page_type] || Central.config.cms.blueprint.default;
    const {
      attributes,
      fields,
      items
    } = ControllerAdminPage.get_blueprint_props(blueprint);

    const blocks_blueprint = {};
    Object.keys(Central.config.cms.blocks).forEach(blockName => {
      blocks_blueprint[blockName] = ControllerAdminPage.get_blueprint_props(Central.config.cms.blocks[blockName]);
    })

    templateData.attributes   = [...(new Set(attributes).values())];
    templateData.fields       = [...(new Set(fields).values())];
    templateData.items        = [...(new Set(items).values())]
    templateData.inputs       = Central.config.cms.inputs;
    templateData.blocks_blueprint = blocks_blueprint;

    const tpl = Central.config.cms.blueprint[editTemplateFolder] ? `templates/admin/page/page_types/${editTemplateFolder}/edit` : `templates/admin/page/page_types/default/edit`;
    ControllerMixinView.setTemplate(this.state, tpl, templateData, `templates/admin/page/page_types/default/edit`);
  }

  static get_blueprint_props(config_blueprint){
    //deep copy config
    const blueprint = JSON.parse(JSON.stringify(config_blueprint))

    const attributes = [];
    const fields = [];
    const items = [];

    blueprint.forEach(it => {
      if(typeof it === 'object'){
        Object.keys(it).forEach(key => {
          items.push({
            name: key,
            attributes: it[key].filter(it => /^@/.test(it)).map(it => it.replace('@', '')),
            fields: it[key].filter(it => /^[^@]/.test(it)).map(it => it.split('__')[0])
          });
        });
      }else if(/^@/.test(it)){
        attributes.push(it.replace('@', ''));
      }else{
        fields.push(it.split('__')[0]);
      }
    });

    return{
      attributes,
      fields,
      items
    }
  }

  async action_create(){
    const page = this.state.get('instance');
    this.setEditTemplate(page, false, {}, {});
  }

  async action_edit() {
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const liveDatabase = this.state.get(ControllerMixinDatabase.DATABASES).get('live');
    const tagDatabase = this.state.get(ControllerMixinDatabase.DATABASES).get('tag');
    const language = this.state.get(Controller.STATE_LANGUAGE);

    const page = this.state.get('instance');
    const livePage = await ORM.readBy(Page, 'id', [page.id], {database: liveDatabase, limit:1, asArray:false});

    const original = HelperPageText.getOriginal(page);
    const defaultOriginal = HelperPageText.blueprint(page.page_type, Central.config.cms.blueprint, Central.config.cms.defaultLanguage);

    page.print = HelperPageText.originalToPrint(HelperPageText.mergeOriginals(defaultOriginal, original), language, null);

    const placeholders = HelperPageText.originalToPrint(original, language, Central.config.cms.defaultLanguage);

    /** parse tags **/
    await page.eagerLoad({ with:['PageTag'] }, {database});
    await ORM.eagerLoad(page.page_tags, {with:['Tag'], tag : {with: ['TagType']}}, {database: tagDatabase});

    page.tags = {};
    page.page_tags.forEach(page_tag => {
      const tag = page_tag.tag;
      const print = HelperPageText.originalToPrint(HelperPageText.getOriginal(tag), language, Central.config.cms.defaultLanguage);
      page.tags[tag.tag_type.name] ||= [];
      page.tags[tag.tag_type.name].push({id:page_tag.id, name: tag.name, value: print.tokens.name || tag.name});
    });

    const pageTagSet = new Set(page.page_tags.map(it => it.id));

    const templateTags = {}
    const tags = await ORM.readAll(Tag, {database:tagDatabase, asArray:true});
    await ORM.eagerLoad(tags, {with:['TagType']}, {database:tagDatabase});

    tags.forEach(tag => {
      if(pageTagSet.has(tag.id))return;

      const print = HelperPageText.originalToPrint(HelperPageText.getOriginal(tag), language, Central.config.cms.defaultLanguage);
      templateTags[tag.tag_type.name] ||= [];
      templateTags[tag.tag_type.name].push({id:tag.id, name: tag.name, value: print.tokens.name || tag.name})
    })
    /** end parse tag **/

    const layout = this.state.get(ControllerMixinView.LAYOUT);
    layout.data = Object.assign({scripts: [], defer_scripts:[]}, layout.data);
    layout.data.defer_scripts.push('admin/pages/edit.mjs');

    this.setEditTemplate(page, livePage, placeholders, templateTags);
  }

  async action_read(){
    await this.action_edit();
  }

  async action_delete(){
    if(this.state.get(ControllerMixinORMDelete.DELETED)){
      const page = this.state.get(ControllerMixinORMDelete.INSTANCE);
      await this.unpublish(page.id);
      //redirect to page type index
      await this.redirect(`/admin/contents/list/${page.page_type}`, true);
    }
  }

  async action_add_item(){
    const {page_id:pageId, item_name:itemName} = this.state.get(Controller.STATE_PARAMS);

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Page, pageId, {database});
    if(!page) throw new Error(`Page ${pageId} not found`);
    await this.item_add(page, itemName);
    await this.redirect(`/admin/pages/${page.id}`, true);
  }

  async action_delete_item(){
    const {page_id:pageId, item_name:itemName, index:itemIndex} = this.state.get(Controller.STATE_PARAMS);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Page, pageId, {database});

    await this.item_delete(page, itemName, itemIndex);
    await this.redirect(`/admin/pages/${page.id}`, true);
  }

  async block_add(page, blockName){
    if(!blockName)return;

    const blueprint = Central.config.cms.blocks[blockName];
    if(!blueprint) throw new Error(`Block ${blockName} not defined in config`);

    const defaultBlock = HelperPageText.blueprint(blockName, Central.config.cms.blocks, Central.config.cms.defaultLanguage);
    delete defaultBlock.blocks;

    const original = HelperPageText.getOriginal(page);
    original.blocks ||=[];
    original.blocks.push(defaultBlock);

    page.original = JSON.stringify(original);
    await page.write();

  }

  async block_delete(page, blockIndex){
    const original = JSON.parse(page.original);
    original.blocks.splice(parseInt(blockIndex), 1);

    page.original = JSON.stringify(original);
    await page.write();
  }

  async block_item_add(page, blockIndex, itemName){
    const original = HelperPageText.getOriginal(page);
    const blockItems = original.blocks[blockIndex].items[itemName];
    blockItems.push({attributes:{_weight: blockItems.length}, values:{}});

    page.original = JSON.stringify(original);
    await page.write();
  }

  async block_item_delete(page, blockIndex, itemName, itemIndex){
    const original = JSON.parse(page.original);
    const blockItems = original.blocks[blockIndex].items[itemName];
    blockItems.splice(parseInt(itemIndex), 1);

    page.original = JSON.stringify(original);
    await page.write();
  }

  async item_add(page, itemName){
    const defaultOriginal = HelperPageText.blueprint(page.page_type, Central.config.cms.blueprint, Central.config.cms.defaultLanguage || 'en');
    const defaultItem = defaultOriginal.items[itemName][0];
    const original = HelperPageText.getOriginal(page);

    if(!original.items[itemName]){
      //create first item
      original.items[itemName] = HelperPageText.blueprint(page.page_type, Central.config.cms.blueprint, Central.config.cms.defaultLanguage || 'en').items[itemName]
    }

    defaultItem.attributes._weight = original.items[itemName].length;
    original.items[itemName].push(defaultItem);

    page.original = JSON.stringify(original);
    await page.write();
  }

  async item_delete(page, itemName, itemIndex){
    const original = JSON.parse(page.original);
    original.items[itemName].splice(itemIndex, 1);
    page.original = JSON.stringify(original);
    await page.write();
  }

  async action_add_block(){
    const {page_id:pageId, block_name:blockName} = this.state.get(Controller.STATE_PARAMS);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Page, pageId, {database});
    if(!page) throw new Error(`Page ${pageId} not found`);

    await this.block_add(page, blockName);

    await this.redirect(`/admin/pages/${pageId}`, true);
  }

  async action_delete_block(){
    const {page_id:pageId, index:blockIndex} = this.state.get(Controller.STATE_PARAMS);

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Page, pageId, {database});
    if(!page) throw new Error(`Page ${pageId} not found`);

    await this.block_delete(page, blockIndex);
    await this.redirect(`/admin/pages/${pageId}`,true);
  }

  async action_add_block_item(){
    const {page_id: pageId, block_index: blockIndex, item_name: itemName } = this.state.get(Controller.STATE_PARAMS);

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Page, pageId, {database});
    await this.block_item_add(page, blockIndex, itemName);
    await this.redirect(`/admin/pages/${pageId}`, true);
  }

  async action_delete_block_item(){
    const {page_id: pageId, block_index: blockIndex, item_name: itemName, index:itemIndex } = this.state.get(Controller.STATE_PARAMS);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Page, pageId, {database});
    await this.block_item_delete(page, blockIndex, itemName, itemIndex);

    await this.redirect(`/admin/pages/${pageId}`, true);
  }
}