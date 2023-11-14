import HelperPage from "../../../classes/helper/Page.mjs";
import MediaPort from "../../../classes/MediaPort";

HelperPage.enableAutoSave();
//HelperPage.enablePointers();
//HelperPage.enableBlock();
HelperPage.enablePageTag();
HelperPage.enablePageInput();

const apiKey = {
  'admin.example.com' : 'api-name',
}

const uploadURL = {
  'admin.example.com' : 'https://mediaport.dappod.com/upload',
}

MediaPort.enableUpload(uploadURL[window.location.hostname] || '/admin/upload', {
  apiKey : apiKey[window.location.hostname] || 'default',
  dir : 'cms',
  previewUrl : window.location.origin + '/'
});

tinymce.init({
  selector: 'textarea',
  menubar: '',
  branding: false,
  width: '100%',
  plugins: 'code',
  toolbar: 'undo redo bold italic removeformat code',
  paste_as_text: true
}).then();