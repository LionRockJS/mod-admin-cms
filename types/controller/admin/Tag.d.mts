import { ControllerAdmin } from '@lionrockjs/mod-admin';
export default class ControllerAdminTag extends ControllerAdmin {
    constructor(request: any);
    before(): Promise<void>;
    action_index(): Promise<void>;
    action_create(): Promise<void>;
    action_read(): Promise<void>;
    action_edit(): Promise<void>;
    action_new_post(): Promise<void>;
    action_update(): Promise<void>;
    action_delete(): Promise<void>;
}
