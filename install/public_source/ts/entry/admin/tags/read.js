import HelperPage from "../../../classes/helper/Page.mjs";

HelperPage.enableAutoSave();

document.querySelectorAll('.page-field-auto-complete').forEach(el => {
  const inputField = el.querySelector('.page-field-auto-complete-search');
  const valueField = el.querySelector('.page-field-auto-complete-value');

  inputField.addEventListener('change', () =>{
    const option = el.querySelector(`option[value="${inputField.value}"]`);
    valueField.value = option ? option.getAttribute('data-id') : '';
  })
})