import {Central} from '@lionrockjs/central';

export default class HelperPageText{
  static defaultOriginal(){
    return {...this.defaultOriginalItem(),"items":{}};
  }

  static defaultOriginalItem(){
    return {"attributes":{},"pointers":{},"values":{}}
  }

  static getOriginal(page, attributes={}){
    if(!page.original)return this.defaultOriginal();

    const original = JSON.parse(page.original);
    Object.assign(original.attributes, attributes);

    return original;
  }

  static mergeOriginals(target, source) {
    const result = this.defaultOriginal();
    result.attributes = {...target.attributes, ...source.attributes};
    result.pointers = {...target.pointers, ...source.pointers};

    const languageSet = new Set([...Object.keys(target.values), ...Object.keys(source.values)]);
    languageSet.forEach(language =>{
      const targetValues = target.values[language] || {};
      const sourceValues = source.values[language] || {};
      result.values[language] = {...targetValues, ...sourceValues}
    });

    const itemSet = new Set([...Object.keys(target.items), ...Object.keys(source.items)]);
    itemSet.forEach( itemType => {
      const targetItems = target.items[itemType] || [];
      const sourceItems = source.items[itemType] || [];
      result.items[itemType] = [];

      const length = Math.max(targetItems.length, sourceItems.length);
      for( let i=0; i<length; i++){
        result.items[itemType][i] = {attributes:{}, pointers:{}, values:{}};
        const resultItem = result.items[itemType][i];
        resultItem.attributes = {...targetItems[i]?.attributes, ...sourceItems[i]?.attributes};
        resultItem.pointers = {...targetItems[i]?.pointers, ...sourceItems[i]?.pointers};

        const itemLanguageSet = new Set([...Object.keys(targetItems[i]?.values || {}), ...Object.keys(sourceItems[i]?.values || {})]);
        itemLanguageSet.forEach(language =>{
          const targetValues = targetItems[i]?.values[language] || {};
          const sourceValues = sourceItems[i]?.values[language] || {};
          resultItem.values[language] = {...targetValues, ...sourceValues}
        });
      }
    });

    if(target.blocks || source.blocks){
      result.blocks = [].concat((target.blocks || []), source.blocks).filter(it => !!it);
    }

    return result;
  }

  static tokenToObject(tokens){
    Object.keys(tokens).forEach(token => {
      //array is items
      if(Array.isArray(tokens[token])){
        const items = tokens[token];
        items.forEach(it => this.tokenToObject(it));
        return;
      }

      //find nested datatype xxx__yyy to xxx: {yyy:""}
      //if xxx exist, rename to xxx_1
      //keep xxx__yyy
      const m = token.match(/^(\w+)__(\w+)$/);
      if(!m)return;
      if(typeof tokens[m[1]] === 'string'){
        tokens[m[1]+'_1'] = tokens[m[1]];
        tokens[m[1]] = {};
      }
      //append to exist xxx
      tokens[m[1]] = tokens[m[1]] || {};
      tokens[m[1]][m[2]] = tokens[token];
    });
  }

  static flattenTokens(original, languageCode, masterLanguage=null){
    const result = Object.assign({}, original.attributes, original.pointers, (masterLanguage ? original.values[masterLanguage] : null), original.values[languageCode]);
    Object.keys(original.items).forEach(key => {
      result[key] = original.items[key].map(it => Object.assign({}, it.attributes, it.pointers, (masterLanguage ? it.values[masterLanguage] : null), it.values[languageCode]))
    });
    //collect xxx__yyy to xxx: {yyy:""}
    this.tokenToObject(result);
    return result;
  }

  //empty value will replace with master language
  static originalToPrint(original, languageCode, masterLanguageCode){
    const result = {
      tokens : this.flattenTokens(original, languageCode, masterLanguageCode),
      blocks:[],
      tags: {}
    };

    (original.tags || []).forEach(tag => {
      const tagToken = this.flattenTokens(tag, languageCode, masterLanguageCode);

      result.tags[tagToken._type] ||= [];
      result.tags[tagToken._type].push(tagToken);
    })

    if(!original.blocks)return result;

    result.blocks = original.blocks.filter(block => !!block).map(block => ({
      tokens:this.flattenTokens(block, languageCode, masterLanguageCode)
    }))

    result.blocks.forEach(block => {
      const blockName = block.tokens._name;
      if(blockName) result.tokens['__'+blockName] = block.tokens ;
    })

    return result;
  }

  static pageToPrint(page, languageCode, masterLanguageCode = 'en'){
    if(!page)return null;
    if(!page.original)return null;
    const timezone = Central.config.cms.timezone || 'z';

    //check have schedule;
    if(
      (!!page.start && Date.now() < new Date(page.start+timezone).getTime()) ||
      (!!page.end   && Date.now() > new Date(page.end+timezone).getTime())
    ){
      return null;
    }

    return this.originalToPrint(JSON.parse(page.original), languageCode, masterLanguageCode);
  }
}