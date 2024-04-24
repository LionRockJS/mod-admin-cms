const {stat, mkdir, copyFile, unlink} = require('node:fs').promises;

import path from 'node:path';
import { Controller } from "@lionrockjs/mvc";
import { ControllerMixinDatabase, ControllerMixinMime, ControllerMixinView, Central } from "@lionrockjs/central";
import { ControllerMixinLoginRequire } from "@lionrockjs/mod-auth";
import { ControllerMixinSession } from "@lionrockjs/mod-session";
import { ControllerMixinMultipartForm } from "@lionrockjs/mod-form";

export default class ControllerAdminUpload extends Controller{
  static mixins = [...Controller.mixins,
    ControllerMixinDatabase,
    ControllerMixinSession,
    ControllerMixinLoginRequire,
    ControllerMixinMime,
    ControllerMixinView,
    ControllerMixinMultipartForm
  ];

  constructor(request){
    super(request);

    this.state.get(ControllerMixinDatabase.DATABASE_MAP)
      .set('session', `${Central.config.auth.databasePath}/session.sqlite`);

    this.state.set(ControllerMixinLoginRequire.REJECT_LANDING, '/login');
    this.state.set(ControllerMixinLoginRequire.ALLOW_ROLES, new Set(['admin', 'staff', 'moderator']));

    const headers = this.state.get(Controller.STATE_HEADERS);
    headers['Content-Type'] = 'application/json';
  }

  async action_upload_post(){
    const $_POST = this.state.get(ControllerMixinMultipartForm.POST_DATA);
    const uploadDirectory = $_POST['dir'] || 'upload';
    if(uploadDirectory.includes('../'))throw new Error('upload directory cannot contain ../');

    const today = new Date();
    const uploadFolder = path.normalize(`${Central.EXE_PATH}/../public/media/${uploadDirectory}`)
    const dateFolder = path.normalize(`${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()}`);
    const uploadDateFolder = path.normalize(uploadFolder+'/'+dateFolder);

    //create folder
    try{
      await stat(uploadDateFolder)
    }catch(err){
      if(err.code === 'ENOENT'){
        await mkdir(uploadDateFolder, {recursive: true});
      }else{
        throw err;
      }
    }

    const files = await Promise.all(Object.keys($_POST).map(async key =>{
      if(!$_POST[key].filename)return null;

      const fileField = $_POST[key];

      const uploadPath = `${dateFolder}/${fileField.tmpName}-${fileField.filename.replace(/[^a-z0-9-_.]/gi, "")}`;
      await copyFile(fileField.tmp, path.normalize(uploadFolder + '/' + uploadPath));
      await unlink(fileField.tmp);

      return 'media/' + uploadDirectory + '/' + uploadPath.replaceAll('\\', '/');
    }))

    this.state.set(Controller.STATE_BODY, {
      success: true,
      files: files.filter(it => it !== null)
    });
  }
}