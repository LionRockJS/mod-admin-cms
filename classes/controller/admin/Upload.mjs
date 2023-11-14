const path = require('node:path');

const {stat, mkdir, copyFile, unlink} = require('node:fs').promises;

const {Controller} = require("@kohanajs/core-mvc");
const { ControllerMixinDatabase, ControllerMixinMime, ControllerMixinView, KohanaJS} = require("kohanajs");
const { ControllerMixinLoginRequire } = require('@kohanajs/mod-auth');
const { ControllerMixinSession } = require('@kohanajs/mod-session');

const { ControllerMixinMultipartForm } = require('@kohanajs/mod-form');

class ControllerAdminUpload extends Controller{
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
      .set('session', `${KohanaJS.config.auth.databasePath}/session.sqlite`);

    this.state.set(ControllerMixinLoginRequire.REJECT_LANDING, '/login');
    this.state.set(ControllerMixinLoginRequire.ALLOW_ROLES, new Set(['admin', 'staff', 'moderator']));

    this.headers['Content-Type'] = 'application/json';
  }

  async action_upload_post(){
    const $_POST = this.state.get(ControllerMixinMultipartForm.POST_DATA);
    const uploadDirectory = $_POST['dir'] || 'upload';
    if(uploadDirectory.includes('../'))throw new Error('upload directory cannot contain ../');

    const today = new Date();
    const uploadFolder = path.normalize(`${KohanaJS.EXE_PATH}/../public/media/${uploadDirectory}`)
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

    this.body = {
      success: true,
      files: files.filter(it => it !== null)
    }
  }
}

module.exports = ControllerAdminUpload;