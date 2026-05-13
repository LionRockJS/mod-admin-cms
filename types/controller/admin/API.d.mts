import { ControllerAdmin } from '@lionrockjs/mod-admin';
export default class ControllerAPI extends ControllerAdmin {
    constructor(request: any);
    action_pages(): Promise<void>;
    action_tags(): Promise<void>;
    action_add_page_tag(): Promise<void>;
    action_delete_page_tag(): Promise<void>;
}
