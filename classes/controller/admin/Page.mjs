import pluralize from 'pluralize';
import path from "node:path";
import fs from 'node:fs';
import {stat, mkdir} from 'node:fs/promises';

import {
  ControllerAdmin,
  ControllerMixinAdminTemplates,
  ControllerMixinCRUDRedirect,
  ControllerMixinImport
} from '@lionrockjs/mod-admin';

import {Controller, ControllerMixinDatabase, ControllerMixinView, Central, ORM, Model} from '@lionrockjs/central';
import {ControllerMixinORMDelete, ControllerMixinORMRead} from '@lionrockjs/mixin-orm';
import { ControllerMixinMultipartForm } from '@lionrockjs/mixin-form';
import {HelperPageText} from "@lionrockjs/mod-cms-read";

import slugify from 'slugify';

import DefaultPage from '../../model/Page.mjs';
import DefaultPageTag from '../../model/PageTag.mjs';
import DefaultTag from '../../model/Tag.mjs';
import DefaultTagType from '../../model/TagType.mjs';
import HelperPageEdit from "../../helper/PageEdit.mjs";

const Page = await ORM.import('Page', DefaultPage);
const PageTag = await ORM.import('PageTag', DefaultPageTag);
const Tag = await ORM.import('Tag', DefaultTag);
const TagType = await ORM.import('TagType', DefaultTagType);

const capitalize = val => String(val).charAt(0).toUpperCase() + String(val).slice(1);

export default class ControllerAdminPage extends ControllerAdmin {
  static STATE_ORIGINAL_SNAPSHOT = "page_original_snapshot";
  static STATE_POST_ORIGINAL = "page_post_original";

  page_type = 'default';
  controller_slug = 'pages';

  constructor(request, options = {}) {
    super(request, Page, {
      roles: new Set(['admin', 'staff']),
      databases: new Map([
        ['draft', `${Central.config.cms.databasePath}/content.sqlite`],
        ['live', `${Central.config.cms.databasePath}/www/content.sqlite`],
        ['trash', `${Central.config.cms.databasePath}/trash/content.sqlite`],
        ['tag', `${Central.config.cms.databasePath}/www/tag.sqlite`],
      ]),
      orderBy: new Map([[request.query.sort ?? 'weight', request.query.order ?? 'DESC'], ['created_at', 'DESC']]),
      database: 'draft',
      templates: new Map([
        ['index', `templates/admin/page/page_types/default/index`],
      ]),
      page_type: 'default',
      controller_slug: 'pages',
      ...options,
    });

    this.state.get(Controller.STATE_HEADERS)['Access-Control-Allow-Origin']  = '*';
    this.state.set(Controller.STATE_LANGUAGE, this.state.get(Controller.STATE_LANGUAGE) || Central.config.cms.defaultLanguage || 'en');

    this.page_type = this.state.get(Controller.STATE_PARAMS).page_type || this.options.page_type;
    this.controller_slug = this.options.controller_slug;

    this.state.set(ControllerMixinImport.UNIQUE_KEY, 'slug');
    this.state.set(ControllerMixinORMRead.LIST_FILTER, [['AND', 'page_type', 'EQUAL', this.page_type]]);
  }

  async action_index(){
    const page_type = this.page_type;

    const instances = this.state.get('instances') || [];

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('live');
    const livePages = await ORM.readBy(Page, 'id', [instances.map(it => it.id)], {database, asArray:true});
    const livePageMap = new Map(livePages.map(page => [page.id, page]));

    const items = instances.filter(it => it.page_type === page_type);
    items.forEach(page => {
      const livePage = livePageMap.get(page.id);
      page.published = !!livePage;
      if(page.published){
        page.live_weight = livePage.weight;
        page.synced = page.original === livePage.original && page.slug === livePage.slug;
      }
    });

    Object.assign(
        this.state.get(ControllerMixinView.TEMPLATE).data,
        { items, page_type }
    );
  }

  async action_create_by_type(){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page_type = this.page_type;

    const weight = await ORM.countBy(Page, 'page_type', [page_type], {database});
    const insertID = Model.defaultAdapter.defaultID();
    const page = ORM.create(Page, {database, insertID});
    page.name = `Untitled ${pluralize.singular(page_type.replace(/[_-]/gi, ' '))}`;
    page.page_type = page_type;
    page.slug = String(insertID);
    page.weight = weight + 1;

    const defaultOriginal = HelperPageEdit.blueprint(page_type, Central.config.cms.blueprint, Central.config.cms.defaultLanguage || 'en');

    page.original = JSON.stringify(defaultOriginal);
    page.print = HelperPageText.originalToPrint(defaultOriginal, this.state.get(Controller.STATE_LANGUAGE), Central.config.cms.defaultLanguage);
    page.id = `new_post/${page_type}`;
    this.state.set('instance', page);

    await ControllerMixinAdminTemplates.action_edit(this.state);
    await this.action_create()
  }

  async action_import_post(){
    this.state.set(ControllerMixinCRUDRedirect.REDIRECT, this.state.get(ControllerMixinCRUDRedirect.REDIRECT) || `/admin/${this.controller_slug}/list/${this.page_type}`);
  }

  async action_search(){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page_type = this.page_type;

    const query = this.state.get(Controller.STATE_QUERY).search;

    const page = parseInt(this.state.get(Controller.STATE_QUERY).page ?? '1', 10) - 1;
    const offset = page * this.options.limit;

    const instances =  await ORM.readWith(Page, [['','page_type', 'EQUAL', page_type], ['AND', 'name', 'LIKE', `%${query}%`]], {database, asArray:true});
    this.state.set('instances', instances);
    this.state.set(ControllerMixinORMRead.COUNT, instances.length);
    this.state.set(ControllerMixinORMRead.PAGINATE, {
      current_offset: offset,
      current_page: page + 1,
      items: instances.length,
      page_param: 'pages',
      page_size: this.options.limit,
      pages: Math.ceil(instances.length / this.options.limit),
      parts:[],
      previous:{},
      next:{},
    })

    await ControllerMixinAdminTemplates.action_index(this.state);

    await this.action_index();
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

  async action_new_post(){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const $_POST = this.state.get(ControllerMixinMultipartForm.POST_DATA);

    const page = ORM.create(Page, {database});
    page.page_type = this.page_type;
    page.name = $_POST['.name'] || `Untitled ${this.page_type}`;
    page.slug = slugify(page.name).toLowerCase();
    await page.write();
    this.state.set('instance', page);
    await this.action_update();
  }

  isPostOriginalDiff(postOriginal, original, action){
    if(action === "block-delete" || action === "block-item-delete" || action === "item-delete") {
//      Central.log(`action: ${action}, always save version`);
      return true;
    }

    //loop postOriginal, if different from original, save a version.
    for(const key in postOriginal.attributes){
      if(postOriginal.attributes[key] !== original.attributes[key]){
        if(key === "_modified_by")continue; //modified_by is not post by user, so skip it
        if(key === "_weight"){
          const postWeight = parseInt(postOriginal.attributes[key]);
          const originalWeight = parseInt(original.attributes[key]);
          if(postWeight === originalWeight)continue;
        }

//        Central.log(`Attribute ${key} changed from ${original.attributes[key]} to ${postOriginal.attributes[key]}`);
        return true;
      }
    }

    for(const key in postOriginal.pointers){
      if(postOriginal.pointers[key] !== original.pointers[key]){
//        Central.log(`Pointer ${key} changed from ${original.pointers[key]} to ${postOriginal.pointers[key]}`);
        return true;
      }
    }

    for(const lang in postOriginal.values){
       if(original.values[lang] === undefined){
//         Central.log(`Language ${lang} not found in original values`);
          return true;
       }
       for(const key in postOriginal.values[lang]){
          if(postOriginal.values[lang][key] !== original.values[lang][key]){
//            Central.log(`Value ${key} in language ${lang} changed from ${original.values[lang][key]} to ${postOriginal.values[lang][key]}`);
            return true;
          }
       }
    }

    for(const itemName in postOriginal.items){
      const originalItems = original.items[itemName];
      const postOriginalItems = postOriginal.items[itemName];

      if(!originalItems) {
//        Central.log(`Item ${itemName} not found in original items`);
        return true;
      }

      if(postOriginalItems.length !== originalItems.length){
//        Central.log(`Item ${itemName} length changed from ${originalItems.length} to ${postOriginalItems.length}`);
        return true;
      }

      for(let i=0; i < postOriginalItems.length; i++){
        if(this.isPostOriginalDiff(postOriginalItems[i], originalItems[i], action)){
//          Central.log(`Item ${itemName} at index ${i} changed`);
          return true;
        }
      }
    }
    if(!postOriginal.blocks)return false; //no blocks in postOriginal, no diff

    const originalBlocks = original.blocks || [];
    if(postOriginal.blocks.length !== originalBlocks.length){
//      Central.log(`Blocks length changed from ${originalBlocks.length} to ${postOriginal.blocks.length}`);
      return true;
    }

    for(let i=0; i < postOriginal.blocks.length; i++){
      if(!originalBlocks[i]){
//        Central.log(`Block at index ${i} not found in original blocks`);
        return true;
      }

      if(this.isPostOriginalDiff(postOriginal.blocks[i], originalBlocks[i], action)){
//        Central.log(`Block at index ${i} changed`);
        return true;
      }
    }
    return false;
  }

  async saveVersion(postOriginal, original, id, slug, action){
    if(!this.isPostOriginalDiff(postOriginal, original, action)) return;

    const targetFile = `${Central.config.cms.versionPath}/${id}/${Math.floor(Date.now()/1000)}.json`;
    const targetDirectory = path.dirname(targetFile);
    //create folder if not exist
    try{
      await stat(targetDirectory)
    }catch(err){
      if(err.code === 'ENOENT'){
        await mkdir(targetDirectory, {recursive: true});
      }else{
        throw err;
      }
    }

    original.attributes._slug = slug;
    fs.writeFileSync(targetFile, JSON.stringify({...original}, null, 2));
  }

  async action_update() {
    const $_POST = this.state.get(ControllerMixinMultipartForm.POST_DATA);
    const action = $_POST['action'] || "";
    const actions = action.split(':');
    const actionType = actions[0];
    const actionParam = actions[1] ?? "";
    const actionParams = actionParam.split('|');
    const count = parseInt($_POST['count:'+actionParam] || "1");

    if(action === 'publish_weights')await this.publish_weights();

    //if no param id, create page proxy
    const instance = this.state.get('instance');
    if(!instance)return;
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');

    //auto name
    if(/(^|\s)(untitled|undefined|null)($|\s)/i.test($_POST[':name'])){
      instance.name = $_POST['.name'] || $_POST['@name'] || `Page ${instance.id}`;
    }

    const Model = this.state.get(ControllerMixinORMRead.MODEL);
    if(Model.fields.get('slug')){
      //auto slug
      if($_POST[':slug'] === String(instance.id) || /(^|\s|-)(untitled|undefined|null)($|\s|-)/i.test($_POST[':slug'])){
        const slug = slugify(instance.name || instance.id ).toLowerCase();
        const slugExist = await ORM.readBy(Model, 'slug', [slug], {database, asArray:false});
        instance.slug = slugExist ? (slug + instance.id) : slug;
      }else{
        instance.slug = slugify(instance.slug).toLowerCase().trim();
      }
    }

    const postOriginal = HelperPageEdit.postToOriginal($_POST, this.state.get(Controller.STATE_LANGUAGE));
    // modified_by is always current user
    postOriginal.attributes._modified_by = this.state.get(Controller.STATE_REQUEST).session?.user_meta?.full_name ?? '';
    const original = HelperPageEdit.getOriginal(instance);
    this.state.set(ControllerAdminPage.STATE_ORIGINAL_SNAPSHOT, HelperPageEdit.getOriginal(instance));
    this.state.set(ControllerAdminPage.STATE_POST_ORIGINAL, postOriginal);

    await this.saveVersion(postOriginal, original, instance.id, instance.slug, actionType);

    //collect tags and write to original
    await instance.eagerLoad({with:['PageTag']}, {database});
    const databaseTag = this.state.get(ControllerMixinDatabase.DATABASES).get('tag');
    const tagTypes = await ORM.readAll(TagType, {database:databaseTag, asArray:true});
    const tagTypeMap = new Map(tagTypes.map(it => [it.id, it.name]));
    instance.page_tags = instance.page_tags || [];
    const tags = await ORM.readBy(Tag, 'id', instance.page_tags.map(it => it.tag_id), {database: databaseTag, asArray:true });

    const mergedOriginal = HelperPageEdit.mergeOriginals(original, postOriginal);
    mergedOriginal.tags = tags.map(tag => HelperPageEdit.getOriginal(tag, {_id: tag.id, _type_id: tag.tag_type_id, _type:tagTypeMap.get(tag.tag_type_id)}));

    instance.original = JSON.stringify(mergedOriginal);
    await instance.write();

    //page start and end should sync with live version
    await this.updateLiveSchedule(instance);

    switch (actionType){
      case "publish":
        await this.publish(instance);
        break;
      case "revert":
        await this.revert(instance);
        break;
      case "block-add":
        await this.block_add(instance, $_POST['block-select']);
        break;
      case "block-delete":
        await this.block_delete(instance, actionParam);
        break;
      case "block-item-add":
        await this.block_item_add(instance, actionParams[0], actionParams[1], count);
        break;
      case "block-item-delete":
        await this.block_item_delete(instance, actionParams[0], actionParams[1], actionParams[2]);
        break;
      case "item-add":
        await this.item_add(instance, actionParam, count);
        break;
      case "item-delete":
        await this.item_delete(instance, actionParams[0], actionParams[1]);
        break;
    }

    this.state.set(ControllerMixinCRUDRedirect.REDIRECT, this.state.get(ControllerMixinCRUDRedirect.REDIRECT) || `/admin/${this.controller_slug}/edit/${instance.id}`);
  }

  async updateLiveSchedule(instance){
    const Model = this.state.get(ControllerMixinORMRead.MODEL);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('live');
    const livePage = await ORM.readBy(Model, 'id', [instance.id], {database, limit: 1, asArray: false});
    if(!livePage)return;
    if(livePage.start === instance.start && livePage.end === instance.end)return;

    livePage.start = instance.start;
    livePage.end   = instance.end;
    await livePage.write();
  }

  async unpublish(id){
    const Model = this.state.get(ControllerMixinORMRead.MODEL);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('live');
    const existPages = await ORM.readBy(Model, 'id', [id], {database, asArray:true});
    if(existPages.length > 0){
      await Promise.all(existPages.map(async it => it.delete()));
    }
  }

  async revert(page){
    const Model = this.state.get(ControllerMixinORMRead.MODEL);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('live');
    const version = await ORM.factory(Model, page.id, {database});
    page.original = version.original;
    await page.write();
  }

  async publish(page){
    const Model = this.state.get(ControllerMixinORMRead.MODEL);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('live');

    //live database always keep minimal content
    //check page exist, remove it.
    await this.unpublish(page.id, database);

    //create live page with page.id
    const livePage = ORM.create(Model, {database, insertID: page.id});
    Object.assign(livePage, page);
    delete livePage.id;
    await livePage.write();

    //copy page tags
    await page.eagerLoad({with:['PageTag']});
    page.page_tags = page.page_tags || [];

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
    this.state.set(
      ControllerMixinCRUDRedirect.REDIRECT,
      this.state.get(ControllerMixinCRUDRedirect.REDIRECT) || `/admin/${this.controller_slug}/${id}`);
  }

  setEditTemplate(page, livePage=null, placeholders = {}, tags={}){
    //the sequence of item in original is not change, but the weight can be changed
    //template render in order of weight
    //so that assign item index as item key
    Object.keys(page.print.tokens).forEach(token =>{
      if(Array.isArray(page.print.tokens[token])){
        page.print.tokens[token].forEach((it, i) => {
          if(typeof it !== 'object')return;
          it._weight = parseInt(it._weight || "0");
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
            if(typeof it !== 'object')return; //do nothing for block fields;
            // block items
            it._weight = parseInt(it._weight || "0");
            it._key = j
          });
        }
      })
    })

    const templateData = this.state.get(ControllerMixinView.TEMPLATE).data;

    templateData.tokens       = page.print.tokens;
    templateData.blocks       = page.print.blocks;
    templateData.block_names  = Object.keys(Central.config.cms.blocks) || [];
    templateData.language     = this.state.get(Controller.STATE_LANGUAGE);
    templateData.default_language = Central.config.cms.defaultLanguage || 'en';
    templateData.placeholders = placeholders;

    templateData.published    = !!livePage;
    templateData.sync         = page.original === livePage?.original && page.slug === livePage.slug;
    templateData.page_type    = page.page_type;
    templateData.tags         = tags;
    templateData.landing      = Central.config.cms.landing || '';
    templateData.tag_lists    = Central.config.cms.tagLists[page.page_type] || Central.config.cms.tagLists.default;
    templateData.block_lists  = Central.config.cms.blockLists[page.page_type] || Central.config.cms.blockLists.default;

    templateData.original     = page.original;
    templateData.live_original= livePage?.original || {};

    const blueprint = Central.config.cms.blueprint[page.page_type] || Central.config.cms.blueprint.default;
    templateData.blueprint_props = HelperPageEdit.get_blueprint_props(blueprint);

    const blocks_blueprint = {};
    Object.keys(Central.config.cms.blocks).forEach(blockName => {
      blocks_blueprint[blockName] = HelperPageEdit.get_blueprint_props(Central.config.cms.blocks[blockName]);
    })
    templateData.inputs       = Central.config.cms.inputs;
    templateData.blocks_blueprint = blocks_blueprint;

    ControllerMixinView.setTemplate(this.state, `templates/admin/page/page_types/${page.page_type}/edit`, templateData, `templates/admin/page/page_types/default/edit`);
  }


  async action_create(){
    const page = this.state.get('instance');
    this.setEditTemplate(page, false, {}, {});
  }

  static traverse(obj, parentKey = '', callback=()=>{}) {
    if (typeof obj !== 'object' || obj === null) return;

    Object.keys(obj).forEach(key => {
      if (key.startsWith('*')) {
//        result.push({ key, parentKey });
      }
      this.traverse(obj[key], key);
    });
  }

  static hasPointer(obj){
    if (typeof obj !== 'object' || obj === null) return false;

    for (const key in obj) {
      if (key.startsWith('*')) {
        return true;
      }
      if (this.hasPointer(obj[key])) {
        return true;
      }
    }
    return false;
  }

  static async resolvePointer(state, original){
    const Model = this.state.get(ControllerMixinORMRead.MODEL);
    const database = state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const prints = new Map();

    for(let key in original.pointers){
      const pageId = original.pointers[key];
      if(!pageId) continue;
      let print = prints.get(pageId);
      if(!print){
        const page = await ORM.factory(Model, pageId, {database, asArray:false});
        const original = HelperPageEdit.getOriginal(page);
        original.items = {};
        original.blocks = [];

        print = HelperPageText.originalToPrint(original, state.get(Controller.STATE_LANGUAGE), Central.config.cms.defaultLanguage, false);
        print.tokens.id = page.id;
        prints.set(pageId, print);
      }
      original.pointers[key] = print.tokens;
    }

    //loop items

    for(let itemKey in original.items){
      const items = original.items[itemKey];
      for(const item of items){
        if(!item.pointers )continue;

        for(let key in item.pointers){
          const pageId = item.pointers[key];
          if(!pageId) continue;
          let print = prints.get(pageId);
          if(!print){
            const page = await ORM.factory(Model, pageId, {database, asArray:false});
            const original = HelperPageEdit.getOriginal(page);
            original.items = {};
            original.blocks = [];

            print = HelperPageText.originalToPrint(original, state.get(Controller.STATE_LANGUAGE), Central.config.cms.defaultLanguage, false);
            print.tokens.id = page.id;
            prints.set(pageId, print);
          }
          item.pointers[key] = print.tokens;
        }
      }
    }

    //loop blocks
    for(let block in original.blocks){
      await this.resolvePointer(state, block);
    }

  }

  async action_edit() {
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const liveDatabase = this.state.get(ControllerMixinDatabase.DATABASES).get('live');
    const tagDatabase = this.state.get(ControllerMixinDatabase.DATABASES).get('tag');
    const language = this.state.get(Controller.STATE_LANGUAGE);

    const page = this.state.get('instance');
    const Model = this.state.get(ControllerMixinORMRead.MODEL);
    const livePage = await ORM.readBy(Model, 'id', [page.id], {database: liveDatabase, limit:1, asArray:false});

    //if querystring have version, original use version from file

    const original = HelperPageEdit.getOriginal(page, {}, this.state);
    const defaultOriginal = HelperPageEdit.blueprint(page.page_type, Central.config.cms.blueprint, Central.config.cms.defaultLanguage);

    //resolve pointer with print
    await HelperPageText.resolvePointer(database, original, this.state.get(Controller.STATE_LANGUAGE));

    page.print = HelperPageText.originalToPrint(
      HelperPageEdit.mergeOriginals(defaultOriginal, original),
      language, null, false
    );

    const placeholders = HelperPageText.originalToPrint(original, language, Central.config.cms.defaultLanguage, false);

    /** parse tags across database **/
    await page.eagerLoad({ with:['PageTag'] }, {database});
    page.page_tags = page.page_tags || [];

    await Promise.all(
        page.page_tags.map(async page_tag => {
          page_tag.tag = await ORM.factory(Tag, page_tag.tag_id, {database: tagDatabase});
          await page_tag.tag.eagerLoad({with:['TagType']}, {database:tagDatabase});
        })
    )

    page.tags = {};
    page.page_tags.forEach(page_tag => {
      const tag = page_tag.tag;
      const print = HelperPageText.originalToPrint(HelperPageEdit.getOriginal(tag), language, Central.config.cms.defaultLanguage, false);
      page.tags[tag.tag_type.name] ||= [];
      page.tags[tag.tag_type.name].push({id:page_tag.id, name: tag.name, value: print.tokens.name || tag.name});
    });

    const pageTagSet = new Set(page.page_tags.map(it => it.id));

    const templateTags = {}
    const orderBy = new Map([['name', 'ASC']]);
    const tags = await ORM.readAll(Tag, {database:tagDatabase, asArray:true, orderBy});
    await ORM.eagerLoad(tags, {with:['TagType']}, {database:tagDatabase});

    tags.forEach(tag => {
      if(pageTagSet.has(tag.id))return;

      const print = HelperPageText.originalToPrint(HelperPageEdit.getOriginal(tag), language, Central.config.cms.defaultLanguage, false);
      templateTags[tag.tag_type.name] ||= [];
      templateTags[tag.tag_type.name].push({id:tag.id, name: tag.name, value: print.tokens.name || tag.name})
    })
    /** end parse tag **/
    this.setEditTemplate(page, livePage, placeholders, templateTags);
  }

  async action_read(){
    await this.action_edit();
  }

  async action_trash_list(){

  }

  async action_restore(){
    const Model = this.state.get(ControllerMixinORMRead.MODEL);
    const {id} = this.state.get(Controller.STATE_PARAMS);
    const databases = this.state.get(ControllerMixinDatabase.DATABASES);
    const dbTrash = databases.get('trash');
    const dbDraft = databases.get('draft');

    const trashPage = await ORM.factory(Model, id, {database:dbTrash});
    if(!trashPage) throw new Error(`Page ${id} not found in trash`);

    const restorePage = ORM.create(Model, {database: dbDraft, insertID: trashPage.id});
    Object.assign(restorePage, trashPage);
    delete restorePage.id;
    await restorePage.write();

    await trashPage.delete();

    this.state.set(
      ControllerMixinCRUDRedirect.REDIRECT,
      this.state.get(ControllerMixinCRUDRedirect.REDIRECT) || `/admin/${this.controller_slug}/${page.id}`);
  }

  async action_delete(){
    if(this.state.get(ControllerMixinORMDelete.DELETED)){
      const Model = this.state.get(ControllerMixinORMRead.MODEL);
      const databases = this.state.get(ControllerMixinDatabase.DATABASES);
      const page = this.state.get(ControllerMixinORMDelete.INSTANCE);

      const dbTrash = databases.get('trash');
      const trashPage = ORM.create(Model, {database: dbTrash, insertID: page.id});
      Object.assign(trashPage, page);
      trashPage.id = null;
      await trashPage.write();

      await this.unpublish(page.id);

      this.state.set(ControllerMixinCRUDRedirect.REDIRECT,
        this.state.get(ControllerMixinCRUDRedirect.REDIRECT) || `/admin/pages/list/${page.page_type}`
      );
    }
  }

  async action_add_item(){
    const {page_id:pageId, item_name:itemName} = this.state.get(Controller.STATE_PARAMS);

    const Model = this.state.get(ControllerMixinORMRead.MODEL);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Model, pageId, {database});
    if(!page) throw new Error(`Page ${pageId} not found`);
    await this.item_add(page, itemName);

    this.state.set(ControllerMixinCRUDRedirect.REDIRECT,
      this.state.get(ControllerMixinCRUDRedirect.REDIRECT) || `/admin/pages/list/${page.page_type}`
    );

    await this.redirect(`/admin/pages/${page.id}`, true);
  }

  async action_delete_item(){
    const {page_id:pageId, item_name:itemName, index:itemIndex} = this.state.get(Controller.STATE_PARAMS);
    const Model = this.state.get(ControllerMixinORMRead.MODEL);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Model, pageId, {database});

    await this.item_delete(page, itemName, itemIndex);
    await this.redirect(`/admin/pages/${page.id}`, true);
  }

  async block_add(page, blockName){
    if(!blockName)return;

    const blueprint = Central.config.cms.blocks[blockName];
    if(!blueprint) throw new Error(`Block ${blockName} not defined in config`);

    const defaultBlock = HelperPageEdit.blueprint(blockName, Central.config.cms.blocks, Central.config.cms.defaultLanguage);
    delete defaultBlock.blocks;

    const original = HelperPageEdit.getOriginal(page);
    original.blocks ||=[];
    
    // Find highest weight among existing blocks
    let highestWeight = -1;
    for (const block of original.blocks) {
      const weight = block.attributes?._weight !== undefined ? parseInt(block.attributes._weight) : 0;
      if (weight > highestWeight) {
        highestWeight = weight;
      }
    }
    
    // Set weight for the new block
    defaultBlock.attributes = defaultBlock.attributes || {};
    defaultBlock.attributes._weight = highestWeight + 1;
    
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

  async block_item_add(page, blockIndex, itemName, count=1){
    const original = HelperPageEdit.getOriginal(page);
    const blockItems = original.blocks[blockIndex].items[itemName];
    for(let i=0; i<count; i++){
      blockItems.push({attributes:{_weight: blockItems.length}, values:{}});
    }
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

  async item_add(page, itemName, count=1){
    const defaultOriginal = HelperPageEdit.blueprint(page.page_type, Central.config.cms.blueprint, Central.config.cms.defaultLanguage || 'en');
    const defaultItem = defaultOriginal.items[itemName][0];
    const original = HelperPageEdit.getOriginal(page);

    if(!original.items[itemName]){
      //create first item
      original.items[itemName] = HelperPageEdit.blueprint(page.page_type, Central.config.cms.blueprint, Central.config.cms.defaultLanguage || 'en').items[itemName]
    }
    
    // Find highest weight among existing items
    let highestWeight = -1;
    for (const item of original.items[itemName]) {
      const weight = item.attributes?._weight !== undefined ? parseInt(item.attributes._weight) : 0;
      if (weight > highestWeight) {
        highestWeight = weight;
      }
    }

    for(let i=0; i<count; i++){
      const item = JSON.parse(JSON.stringify(defaultItem));
      // Set weight for the new item
      item.attributes = item.attributes || {};
      item.attributes._weight = highestWeight + 1;
      highestWeight++; // Increment for the next item if adding multiple
      original.items[itemName].push(item);
    }

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
    const Model = this.state.get(ControllerMixinORMRead.MODEL);
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Model, pageId, {database});
    if(!page) throw new Error(`Page ${pageId} not found`);

    await this.block_add(page, blockName);

    await this.redirect(`/admin/pages/${pageId}`, true);
  }

  async action_delete_block(){
    const {page_id:pageId, index:blockIndex} = this.state.get(Controller.STATE_PARAMS);
    const Model = this.state.get(ControllerMixinORMRead.MODEL);

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Model, pageId, {database});
    if(!page) throw new Error(`Page ${pageId} not found`);

    await this.block_delete(page, blockIndex);
    await this.redirect(`/admin/${this.controller_slug}/${pageId}`,true);
  }

  async action_add_block_item(){
    const {page_id: pageId, block_index: blockIndex, item_name: itemName } = this.state.get(Controller.STATE_PARAMS);
    const Model = this.state.get(ControllerMixinORMRead.MODEL);

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Model, pageId, {database});
    await this.block_item_add(page, blockIndex, itemName);
    await this.redirect(`/admin/${this.controller_slug}/${pageId}`, true);
  }

  async action_delete_block_item(){
    const {page_id: pageId, block_index: blockIndex, item_name: itemName, index:itemIndex } = this.state.get(Controller.STATE_PARAMS);
    const Model = this.state.get(ControllerMixinORMRead.MODEL);

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
    const page = await ORM.factory(Model, pageId, {database});
    await this.block_item_delete(page, blockIndex, itemName, itemIndex);

    await this.redirect(`/admin/${this.controller_slug}/${pageId}`, true);
  }
}