export default class ScrollBack{
  static saveScroll(){
    sessionStorage.setItem('adminPageScroll', window.scrollY.toString() );
    sessionStorage.setItem('adminPageExit', window.location.href.split('?')[0] );
  }

  static restoreScroll(){
    const lastScroll = sessionStorage.getItem('adminPageScroll');
    if(lastScroll){
      if(sessionStorage.getItem('adminPageExit') !== window.location.href.split('?')[0] )return;
      window.scrollTo({top: parseInt(lastScroll)});
    }
  }

  static saveOnSubmit(form){
    form.addEventListener('submit', () => {
      this.saveScroll();
    });
  }
}