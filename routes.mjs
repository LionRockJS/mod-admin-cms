import { RouteList } from '@lionrockjs/router';
import { HelperCRUD } from '@lionrockjs/mod-admin';

RouteList.add('/admin/pages/add-item/:page_id/:item_name', 'controller/admin/Page', 'add_item');
RouteList.add('/admin/pages/delete-item/:page_id/:item_name/:index', 'controller/admin/Page', 'delete_item');
RouteList.add('/admin/pages/add-block/:page_id/:block_name', 'controller/admin/Page', 'add_block');
RouteList.add('/admin/pages/delete-block/:page_id/:index', 'controller/admin/Page', 'delete_block');
RouteList.add('/admin/pages/add-block-item/:page_id/:block_index/:item_name', 'controller/admin/Page', 'add_block_item');
RouteList.add('/admin/pages/delete-block-item/:page_id/:block_index/:item_name/:index',    'controller/admin/Page', 'delete_block_item');

RouteList.add('/admin/pages/un-publish/:id', 'controller/admin/Page', 'unpublish');
RouteList.add('/admin/pages/trash/:page_type', 'controller/admin/Page', 'trash_list');
RouteList.add('/admin/pages/restore/:id', 'controller/admin/Page', 'restore');

RouteList.add('/admin/pages/list/:page_type', 'controller/admin/Page');
RouteList.add('/admin/pages/import/:page_type', 'controller/admin/Page', 'import_post', 'POST');
RouteList.add('/admin/pages/create_by_type/:page_type', 'controller/admin/Page', 'create_by_type');
RouteList.add('/admin/pages/search/:page_type', 'controller/admin/Page', 'search');

HelperCRUD.add('pages', 'controller/admin/Page');
HelperCRUD.add('tag_types', 'controller/admin/TagType');
HelperCRUD.add('tags', 'controller/admin/Tag');
RouteList.add('/admin/tags/new_post', 'controller/admin/Tag', 'new_post', 'POST');

RouteList.add('/admin/api', 'controller/admin/API');
RouteList.add('/admin/api/pages/:type', 'controller/admin/API', 'pages');
RouteList.add('/admin/api/tags/:type', 'controller/admin/API', 'tags');
RouteList.add('/admin/api/page/:page_id/tag/:tag_id', 'controller/admin/API', 'add_page_tag', 'POST');
RouteList.add('/admin/api/page/remove/page_tag/:id', 'controller/admin/API', 'delete_page_tag', 'DELETE');
RouteList.add('/admin/api/page_tag/:id', 'controller/admin/API', 'delete_page_tag', 'DELETE');

RouteList.add('/admin/upload', 'controller/admin/Upload', 'upload_post', 'POST');