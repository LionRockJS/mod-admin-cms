import PageFieldPage from "../pagefield/Page.mjs";

export default class HelperPage{
  static enableAutoSave(){
    const cbAutoSave = document.getElementById('autosave');
    if(!cbAutoSave)return;

    cbAutoSave.addEventListener('change', evt => {
      evt.currentTarget.form.submit();
    })
  }

  static enablePageInput(){
    PageFieldPage.init();
  }

  static enablePointers(){
    const domRoot = document.querySelector('html');
    const language = domRoot.getAttribute('lang');
    const refPages = document.querySelectorAll('select.ref-pages');
    refPages.forEach(it => {
      const pageType = it.getAttribute('data-pagetype');

      fetch(`/admin/api/pages/${pageType}?language=${language}`).then(res => {
        res.json().then(obj =>{
          console.log(obj);
        })
      })
      console.log(it);
    });

    const refPageItems = document.querySelectorAll('select.ref-page-items');
    refPageItems.forEach(it => {
      const sourceOptions = it.innerHTML;
      const value = it.getAttribute('data-value');
      const pageType = it.getAttribute('data-pagetype');
      const itemName = it.getAttribute('data-item');
      const url = `/admin/api/page-items/${pageType}/${itemName}?language=${language}`;
      it.innerHTML = `<option value="">Loading...</option>`;
      fetch(url).then(res =>{
        res.json().then(pages =>{
          const options = [sourceOptions];
          pages.forEach(page => {
            options.push(`<optgroup label="${page.name}">`)
            page.items.forEach(item => {
              options.push(`<option value="${item.id}" ${(item.id.toString() === value) ? 'selected' : '' }>${item.name}</option>`);
            })
            options.push(`</optgroup>`);
          })
          it.innerHTML = options.join('/n');
        });
      });
    });
  }

  static enableBlock(){
    const elAddBlock = document.getElementById('add-block');
    if(elAddBlock){
      const blockSelect = elAddBlock.querySelector('select');
      const blockBtn = elAddBlock.querySelector('a');

      blockSelect.addEventListener('change', () =>{
        blockBtn.setAttribute('href', blockBtn.getAttribute('data-link').replace('[block_name]', blockSelect.value))
      })
    }
  }

  static addPageTag(pageId, tagId, cb){
    fetch(`/admin/api/page/${pageId}/tag/${tagId}`, {
      credentials: 'include',
      method: "POST",
    }).then(res => res.json().then(fsa => {
      console.log(fsa);
      if(fsa.payload.success !== true)return;
      cb(fsa.payload);
    }))
  }

  static enablePageTag(){
    document.querySelectorAll('.page-tag-form').forEach(el => {
      const pageId = el.getAttribute('data-page');
      const inputField = el.querySelector('.tag-add-input');
      const pageTagList = el.querySelector('.page-tag-list');

      const removePageTag = evt => {
        const element = evt.currentTarget;

        fetch(`/admin/api/page_tag/${element.getAttribute('data-id')}`, {
          credentials: 'include',
          method: "DELETE",
        }).then(res => res.json().then(obj => {
          console.log(obj);
          element.remove();
        }))
      }

      el.querySelector('.toggle-input-tag').addEventListener('click', element => {
        if(inputField.classList.contains('visually-hidden')){
          inputField.classList.remove('visually-hidden');
        }else{
          inputField.classList.add('visually-hidden');
        }
      })

      el.querySelectorAll('.page-tag.badge').forEach(tagElement => {
        tagElement.addEventListener('click', removePageTag);
      })

      inputField.addEventListener('change', () => {
        const option = el.querySelector(`option[value="${inputField.value}"]`);
        if(!option)return;
        const tag_id = option.getAttribute('data-id');
        const tag_value = option.getAttribute('data-value');
        const tag_name = option.getAttribute('data-name');

        this.addPageTag(pageId, tag_id, (payload) => {
          const newTag = document.createElement('span');
          newTag.value = `${tag_value} ( ${tag_name} )`;
          newTag.setAttribute('data-id', payload.id);
          newTag.setAttribute('role', "button");
          newTag.classList.add("badge", "bg-primary", "rounded-pill");
          newTag.innerHTML = `${tag_value} <i class="fas fa-times"></i>`;
          pageTagList.appendChild(newTag);
          pageTagList.appendChild(document.createTextNode(' '));
          inputField.value = '';
          newTag.addEventListener('click', removePageTag);
        })
      });
    })
  }
}