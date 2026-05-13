import { Controller } from "@lionrockjs/central";
export default class ControllerAdminUpload extends Controller {
    static mixins: typeof import("@lionrockjs/central").ControllerMixin[];
    constructor(request: any);
    action_upload_post(): Promise<void>;
}
