import { Controller, ControllerMixinDatabase, ControllerMixinView, Central, ORM } from '@lionrockjs/central';
import { ControllerAdmin } from '@lionrockjs/mod-admin';
import { ControllerMixinMultipartForm } from '@lionrockjs/mixin-form';
import { ControllerMixinORMRead } from '@lionrockjs/mixin-orm';

import {HelperPageText} from "@lionrockjs/mod-cms-read";
import HelperPageEdit from "../../helper/PageEdit.mjs";

import DefaultPageTag from '../../model/PageTag.mjs';
import DefaultTag from '../../model/Tag.mjs';
import DefaultTagType from '../../model/TagType.mjs';

const PageTag = await ORM.import('PageTag', DefaultPageTag);
const Tag = await ORM.import('Tag', DefaultTag);
const TagType = await ORM.import('TagType', DefaultTagType);

import slugify from 'slugify';

export default class ControllerAdminTag extends ControllerAdmin{
  constructor(request){
    super(request, Tag, {
      databases: new Map([
        ['tag',   `${Central.config.cms.databasePath}/www/tag.sqlite`],
        ['draft', `${Central.config.cms.databasePath}/content.sqlite`],//draft is used when deleting tags
        ['live', `${Central.config.cms.databasePath}/www/content.sqlite`],
      ]),
      database: 'tag',
      limit: 99999,
      templates: new Map([
        ['index', 'templates/admin/tags/index'],
        ['create', 'templates/admin/tags/edit'],
        ['edit', 'templates/admin/tags/edit'],
        ['read', 'templates/admin/tags/edit'],
      ]),
    });
    this.state.set(Controller.STATE_LANGUAGE, this.state.get(Controller.STATE_LANGUAGE) || Central.config.cms.defaultLanguage || 'en');
  }

  async before(){
    const {filter_tag_type} = this.state.get(ControllerMixinMultipartForm.GET_DATA);
    if(filter_tag_type){
      const filter = this.state.get(ControllerMixinORMRead.LIST_FILTER);
      filter.push(['AND', 'tag_type_id', 'EQUAL', parseInt(filter_tag_type)])
    }
  }

  async action_index(){
    const {filter_tag_type} = this.state.get(ControllerMixinMultipartForm.GET_DATA);

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('tag');
    const tag_type_records = await ORM.readAll(TagType, {database, asArray:true});
    const tag_types = [];
    tag_type_records.forEach(it => tag_types[it.id] = it.name);

    const filters = tag_type_records.map(it => ({id: it.id, name: it.name}));

    Object.assign(
      this.state.get(ControllerMixinView.TEMPLATE).data,
      {
        filters,
        tag_types,
        filter_tag_type: parseInt(filter_tag_type || 0),
        default_language: Central.config.cms.defaultLanguage,
      }
    );
  }

  async action_create(){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('tag');
    const tag_types = await ORM.readAll(TagType, {database, asArray:true});

    Object.assign(
      this.state.get(ControllerMixinView.TEMPLATE).data,
      {
        tag_types,
        default_language: Central.config.cms.defaultLanguage,
      }
    );
  }

  async action_read() {
    await this.action_edit();
  }

  async action_edit() {
    const instance = this.state.get('instance');

    //get tag types
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('tag');
    const tag_types = await ORM.readAll(TagType, {database, asArray : true});

    const tags = await ORM.readBy(Tag, 'tag_type_id', [instance.tag_type_id], {database, asArray:true});

    if(instance.parent_tag){
      instance.parent_tag = await ORM.factory(Tag, instance.parent_tag, {database});
    }

    const original = HelperPageText.getOriginal(instance);
    const tokens = HelperPageText.originalToPrint(original, this.state.get(Controller.STATE_LANGUAGE), Central.config.cms.defaultLanguage).tokens;
    const placeholders = HelperPageText.originalToPrint(original, Central.config.cms.defaultLanguage, Central.config.cms.defaultLanguage).tokens;

    Object.assign(
      this.state.get(ControllerMixinView.TEMPLATE).data,
      {
        default_language: Central.config.cms.defaultLanguage,
        item: instance,
        tokens,
        placeholders,
        tag_types,
        autosave: this.state.get(Controller.STATE_REQUEST).session.autosave,
        tags : tags.map(tag => {
          return {
            id: tag.id,
            name: tag.name,
            value: tag.name
          }
        }),
      }
    );
  }

  async action_new_post(){
    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('tag');
    const $_POST = this.state.get(ControllerMixinMultipartForm.POST_DATA);

    const postOriginal = HelperPageEdit.postToOriginal($_POST, this.state.get(Controller.STATE_LANGUAGE));
    const tag = ORM.create(Tag, {database});
    tag.name = slugify($_POST['.name']).toLowerCase();
    tag.tag_type_id = parseInt($_POST[':tag_type_id']);
    tag.original = JSON.stringify(postOriginal);

    await tag.write();
    const destination = $_POST.destination || `/admin/tags/${tag.id}`;
    await this.redirect(destination, !$_POST.destination);
  }

  async action_update(){
    const instance = this.state.get('instance');
    if(!instance)return;

    const $_POST = this.state.get(ControllerMixinMultipartForm.POST_DATA);
    const original = HelperPageText.getOriginal(instance);

    const mergeOriginal = HelperPageEdit.mergeOriginals(
      original,
      HelperPageEdit.postToOriginal($_POST, this.state.get(Controller.STATE_LANGUAGE))
    )
    
    instance.original = JSON.stringify(mergeOriginal);
    instance.name = slugify(mergeOriginal.values[Central.config.cms.defaultLanguage]['name']).toLowerCase();

    await instance.write();
  }

  async action_delete(){
    if(this.state.get('deleted')){
      const { id } = this.state.get(Controller.STATE_PARAMS);
      const databases = this.state.get(ControllerMixinDatabase.DATABASES);
      await ORM.deleteBy(PageTag, 'tag_id', [id], {database:databases.get('draft')});
      await ORM.deleteBy(PageTag, 'tag_id', [id], {database:databases.get('live')})
    }
  }
}