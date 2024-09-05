import pluralize from 'pluralize';

import {Controller, ControllerMixinDatabase, ControllerMixinView, ORMAdapter, Central, ORM} from '@lionrockjs/central';
import {ControllerMixinORMRead} from '@lionrockjs/mixin-orm';
import {ControllerAdmin, ControllerMixinImport} from '@lionrockjs/mod-admin';

import DefaultPage from '../../model/Page.mjs';
const Page = await ORM.import('Page', DefaultPage);

export default class ControllerAdminContent extends ControllerAdmin{
  constructor(request, options = {}){
    super(request, Page, {
      databases: new Map([
        ['live', `${Central.config.cms.databasePath}/www/content.sqlite`],
        ['draft', `${Central.config.cms.databasePath}/content.sqlite`],
      ]),
      orderBy: new Map([[request.query.sort ?? 'weight', request.query.order ?? 'DESC'], ['created_at', 'DESC']]),
      database: 'draft',
      templates: new Map([
        ['index', `templates/admin/page/page_types/default/index`],
      ]),
      ...options,
    });

    const {page_type} = this.state.get(Controller.STATE_PARAMS);

    this.state.set(ControllerMixinImport.UNIQUE_KEY, 'slug');
    this.state.set(ControllerMixinORMRead.LIST_FILTER, [['AND', 'page_type', 'EQUAL', page_type]]);
  }

  async action_index(){
    const {page_type} = this.state.get(Controller.STATE_PARAMS);
    const instances = this.state.get('instances');

    const database = this.state.get(ControllerMixinDatabase.DATABASES).get('live');
    const livePages = await ORM.readBy(Page, 'page_type', [page_type], {database, asArray:true});
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
    const {page_type} = this.state.get(Controller.STATE_PARAMS);
    const weight = await ORM.countBy(Page, 'page_type', [page_type], {database});

    const insertID = ORMAdapter.defaultID();
    const page = ORM.create(Page, {database, insertID});
    page.name = `Untitled ${pluralize.singular(page_type.replace(/[_-]/gi, ' '))}`;
    page.page_type = page_type;
    page.slug = String(insertID);
    page.weight = weight + 1;
    await page.write();

    await this.redirect(`/admin/pages/${page.id}`);
  }

  async action_import_post(){
    const {page_type} = this.state.get(Controller.STATE_PARAMS);
    await this.redirect(`/admin/contents/list/${page_type}`);
  }
}