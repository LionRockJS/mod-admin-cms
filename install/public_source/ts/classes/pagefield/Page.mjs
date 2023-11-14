export default class{
  static isInit = false;
  static pages = new Map();

  static init(){
    if(this.isInit)return;
    this.isInit = true;

    const domRoot = document.querySelector('html');
    const language = domRoot.getAttribute('lang');
    const fields = document.querySelectorAll('.pagefield-page');

    fields.forEach(it => {
      const page_type = it.getAttribute('data-page-type');
      const trigger = it.querySelector('.pagefield-page-input');
      const inputValue = it.querySelector('.pagefield-page-value');
      const badgeContainer = it.querySelector('.pagefield-page-badges');
      const datalist = this.fetchPageList(page_type, language);

      //search box UI
      trigger.addEventListener('change', () => {
        const option = datalist.querySelector(`option[value="${trigger.value}"]`);
        //reset input
        trigger.value = '';
        if(!option)return;

        const pageId = option.getAttribute('data-id');
        //check if page already added to inputValue
        if(inputValue.value.split(',').includes(pageId))return;

        //create badge
        this.addPageBadge(badgeContainer, pageId, inputValue, datalist);
        this.updatePageInputValue(inputValue, badgeContainer);
      });

      //parse input value to badges
      inputValue.value.split(',').forEach(pageId => {
        if(!pageId)return;
        this.addPageBadge(badgeContainer, pageId, inputValue, datalist);
      });

      //make badges sortable
      new Sortable(badgeContainer, {
        animation: 150,
        ghostClass: 'opacity-50',
        onEnd: () => this.updatePageInputValue(inputValue, badgeContainer),
      });
    });
  }

  //update page input when badges added, removed or sorted
  static updatePageInputValue(input, pagePanel){
    const badges = pagePanel.querySelectorAll('.badge');
    const ids = Array.from(badges).map(it => it.getAttribute('data-page-id'));
    //remove last -input from trigger.id
    input.value = ids.join(',');
  }

  static addPageBadge(pagePanel, page_id, input, datalist){
    const refPage = document.createElement('span');
    const text = datalist.querySelector(`option[data-id="${page_id}"]`)?.value || page_id;

    refPage.setAttribute('data-page-id', page_id);
    refPage.classList.add("badge", "bg-primary", "rounded-pill");
    refPage.innerHTML = `${text} <i class="fas fa-times"></i>`;
    refPage.addEventListener('click', () => {
      refPage.remove();
      this.updatePageInputValue(input, pagePanel);
    })

    //add to result div
    pagePanel.append(refPage);
  }

  static sort(a,b){
    if(a.name < b.name)return -1;
    if(a.name > b.name)return 1;
    return 0;
  }

  static fetchPageList(pageType, language){
    const id = `page-list-${pageType}`;
    const existDatalist = document.querySelector(`#${id}`);
    if(existDatalist)return existDatalist;

    //load page ids to create datalist
    const datalist = document.createElement('datalist');
    datalist.id = id;
    document.body.appendChild(datalist);

    fetch(`/admin/api/pages/${pageType}?language=${language}`).then(res => {
      res.json().then(pages =>{
        //sort pages by name
        datalist.innerHTML = pages.sort(this.sort).map(it => {
          document.querySelectorAll(`.badge[data-page-id="${it.page}"]`).forEach(badge => {
            badge.innerHTML = `${it.name} <i class="fas fa-times"></i>`
          });
          return `<option value="${it.name}" data-id="${it.page}" />`;
        }).join('\n');
      })
    });
    return datalist;
  }
}