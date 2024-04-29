import { RouteList } from '@lionrockjs/central';
import { HelperCRUD } from '@lionrockjs/mod-admin';

RouteList.add('/admin/pages/add-item/:page_id/:item_name', 'controller/admin/Page', 'add_item');
RouteList.add('/admin/pages/delete-item/:page_id/:item_name/:index', 'controller/admin/Page', 'delete_item');
RouteList.add('/admin/pages/add-block/:page_id/:block_name', 'controller/admin/Page', 'add_block');
RouteList.add('/admin/pages/delete-block/:page_id/:index', 'controller/admin/Page', 'delete_block');
RouteList.add('/admin/pages/add-block-item/:page_id/:block_index/:item_name', 'controller/admin/Page', 'add_block_item');
RouteList.add('/admin/pages/delete-block-item/:page_id/:block_index/:item_name/:index',    'controller/admin/Page', 'delete_block_item');

RouteList.add('/admin/pages/un-publish/:id', 'controller/admin/Page', 'unpublish');

RouteList.add('/admin/contents/list/:page_type', 'controller/admin/Content');
RouteList.add('/admin/contents/import/:page_type', 'controller/admin/Content', 'import_post', 'POST');
RouteList.add('/admin/contents/create/:page_type', 'controller/admin/Content', 'create_by_type');

HelperCRUD.add('pages', 'controller/admin/Page');
HelperCRUD.add('tag_types', 'controller/admin/TagType');
HelperCRUD.add('tags', 'controller/admin/Tag');

RouteList.add('/admin/api', 'controller/admin/API');
RouteList.add('/admin/api/pages/:type', 'controller/admin/API', 'pages');
RouteList.add('/admin/api/tags/:type', 'controller/admin/API', 'tags');

RouteList.add('/admin/api/page/:page_id/tag/:tag_id', 'controller/admin/API', 'add_page_tag', 'POST');
RouteList.add('/admin/api/page_tag/:id', 'controller/admin/API', 'delete_page_tag', 'DELETE');

RouteList.add('/admin/upload', 'controller/admin/Upload', 'upload_post', 'POST');