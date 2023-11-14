const {ControllerMixinDatabase, ControllerMixinView, KohanaJS, ORM} = require("kohanajs");
const {ControllerAdmin} = require("@kohanajs/mod-admin");
const { ControllerMixinMultipartForm } = require('@kohanajs/mod-form');

const HelperPageText = require('../../helper/PageText');

const Tag = ORM.require('Tag');
const TagType = ORM.require('TagType');
const PageTag = ORM.require('PageTag');

class ControllerAdminTag extends ControllerAdmin{
  constructor(request){
    super(request, Tag, {
      databases: new Map([
        ['draft', `${KohanaJS.config.cms.databasePath}/content.sqlite`],
        ['tag',   `${KohanaJS.config.cms.databasePath}/www/tag.sqlite`],
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

    this.language = this.language || KohanaJS.config.cms.defaultLanguage || 'en';
  }

  async action_index(){
    const {filter_tag_type} = this.state.get(ControllerMixinMultipartForm.GET_DATA);

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('tag');
    const tag_type_records = await ORM.readAll(TagType, {database, asArray:true});
    const tag_types = [];
    tag_type_records.forEach(it => tag_types[it.id] = it.name);

    Object.assign(
      this.state.get(ControllerMixinView.TEMPLATE).data,
      {
        tag_types,
        filter_tag_type: parseInt(filter_tag_type || 0)
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
    const tokens = HelperPageText.originalToPrint(original, this.language).tokens;
    const placeholders = HelperPageText.originalToPrint(original, KohanaJS.config.cms.defaultLanguage).tokens;

    Object.assign(
      this.state.get(ControllerMixinView.TEMPLATE).data,
      {
        item: instance,
        tokens,
        placeholders,
        tag_types,
        autosave: this.request.session.autosave,
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

  async action_update(){
    const instance = this.state.get('instance');
    if(!instance)return;

    const $_POST = this.state.get(ControllerMixinMultipartForm.POST_DATA);
    const original = HelperPageText.getOriginal(instance);
    //update original
    Object.keys($_POST).forEach(name => {
      HelperPageText.update(original, name, $_POST[name], this.language)
    });
    instance.original = JSON.stringify(original);
    await instance.write();

    this.request.session.autosave = $_POST['autosave'];

    const destination = $_POST.destination || `/admin/tags/${instance.id}`;
    await this.redirect(destination, !$_POST.destination);
  }

  async action_delete(){
    if(this.state.get('deleted')){
      const { id } = this.request.params;
      const database = this.state.get(ControllerMixinDatabase.DATABASES).get('draft');
      await ORM.deleteBy(PageTag, 'tag_id', [id], {database});
    }
  }
}

module.exports = ControllerAdminTag;