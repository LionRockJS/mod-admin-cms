export default class MediaPort{
  static enableUpload(uploadURL, options = {}){
    const opt = {
      apiKey: 'api',
      dir: 'cms',
      selector: '.page-field-upload',
      selectorFile : 'input[type="file"]',
      callback      : (error, element, result) => {
        if(error)throw error;
        const uploadedFile = result.files[0];
        const txtInput = element.querySelector('.page-field-upload-text');
        const preview = element.querySelector('.preview img')
        txtInput.value = `/${uploadedFile}`;
        if(preview)preview.src = `${options.previewUrl||'https://www.example.com'}${uploadedFile}`;
      },
      ...options
    }

    const uploadFields = document.querySelectorAll(opt.selector);

    uploadFields.forEach(el => {
      const fileInput = el.querySelector(opt.selectorFile);
      fileInput.addEventListener('change', () => {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('dir', opt.dir);
        formData.append('api-key', opt.apiKey);

        fetch(uploadURL, { // Your POST endpoint
          method: 'POST',
          body: formData,
          mode: 'cors', // no-cors, cors, *same-origin
        }).then(
          response => {
            response.json().then(obj => {
              const uploadedFile = obj.files[0];
              if(!uploadedFile)return opt.callback(new Error('upload error'), el, uploadedFile);
              opt.callback(null, el, obj);
            });
          }
        ).catch(
          error => opt.callback(error, el, null)
        );
      }, false);
    })
  }
}