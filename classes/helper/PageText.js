class HelperPageText{
  static getOriginal(page, attributes={}){
    if(!page.original){
      return {"attributes":{}, "values":{}, "items":{}}
    }

    const original = JSON.parse(page.original);
    Object.assign(original.attributes, attributes);

    return original;
  }

  static mergeOriginals(target, source) {
    const result = {attributes:{}, values:{}, items:{}};
    result.attributes = {...target.attributes, ...source.attributes};

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
        result.items[itemType][i] = {attributes:{}, values:{}};
        const resultItem = result.items[itemType][i];
        resultItem.attributes = {...targetItems[i]?.attributes, ...sourceItems[i]?.attributes};
        const itemLanguageSet = new Set([...Object.keys(targetItems[i]?.values || {}), ...Object.keys(sourceItems[i]?.values || {})]);
        itemLanguageSet.forEach(language =>{
          const targetValues = targetItems[i]?.values[language] || {};
          const sourceValues = sourceItems[i]?.values[language] || {};
          resultItem.values[language] = {...targetValues, ...sourceValues}
        });
      }
    });

    if(target.blocks || source.blocks){
      result.blocks = [].concat((target.blocks || []), source.blocks);
    }

    return result;
  }

  static definitionInstance(definitions=[]){
    const result = {};
    definitions.forEach(it => {result[it] = ""});
    return result;
  }

  static blueprint(pageType, blueprints={}, defaultLanguage="en"){
    const original = {"attributes":{},"values":{},"items":{}};
    original.values[defaultLanguage] = {};

    const blueprint = blueprints[pageType];
    if(!blueprint)return original;

    const attributes = blueprint.filter(it => typeof it !== 'object').filter(it => /^@/.test(it)).map(it => it.substring(1));
    const values     = blueprint.filter(it => typeof it !== 'object').filter(it => /^[^@]/.test(it));
    const items      = blueprint.filter(it => typeof it === 'object')

    original.attributes = {_type:pageType, ...this.definitionInstance(attributes)};
    original.values[defaultLanguage] = this.definitionInstance(values);

    items.forEach(item =>{
      const key = Object.keys(item)[0];
      const itemAttributes = item[key].filter(it=>/^@/.test(it)).map(it => it.substring(1));
      const itemValues     = item[key].filter(it => /^[^@]/.test(it));

      const defaultItem = {"attributes":{"_weight": 0}, "values":{}};
      Object.assign(defaultItem.attributes, this.definitionInstance(itemAttributes))
      defaultItem.values[defaultLanguage] = this.definitionInstance(itemValues);
      original.items[key] = [defaultItem];
    })

    return original;
  }

  static tokenToObject(tokens){
    Object.keys(tokens).forEach(token => {
      if(Array.isArray(tokens[token])){
        const items = tokens[token];
        items.forEach(it => this.tokenToObject(it));
        return;
      }

      const m = token.match(/^(\w+)__(\w+)$/);
      if(!m)return;
      tokens[m[1]] ||= {};
      tokens[m[1]][m[2]] = tokens[token];
      delete tokens[token];
    });
  }

  static flattenTokens(original, languageCode, masterLanguage=null){
    const result = Object.assign({}, original.attributes, (masterLanguage ? original.values[masterLanguage] : null), original.values[languageCode]);
    Object.keys(original.items).forEach(key => {
      result[key] = original.items[key].map(it => Object.assign({}, it.attributes, (masterLanguage ? it.values[masterLanguage] : null), it.values[languageCode]))
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

    result.blocks = original.blocks.map(block => ({
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

    //check have schedule;
    if(
      (!!page.start && Date.now() < new Date(page.start+'z').getTime()) ||
      (!!page.end   && Date.now() > new Date(page.end+'z').getTime())
    ){
      return null;
    }

    return this.originalToPrint(JSON.parse(page.original), languageCode, masterLanguageCode);
  }

  static update(original, name, value, language="en"){
    //parse attributes
    let m = name.match(/^@(\w+)$/);
    if(m){
      original.attributes[m[1]] = value;
      if(value === "")delete original.attributes[m[1]];
    }

    //parse values
    m = name.match(/^\.(\w+)\|?([a-z-]+)?$/);
    if(m){
      original.values[ m[2] || language ] ||= {};
      original.values[ m[2] || language ][ m[1] ] = value;

      if(value === "")delete original.values[ m[2] || language ][ m[1] ];
    }

    //parse items
    m = name.match(/^\.(\w+)\[(\d+)\](@(\w+)$|\.(\w+)\|?([a-z-]+)?$)/);
    if(m){
      original.items[ m[1] ] ||= [];
      original.items[ m[1] ][ parseInt(m[2]) ] ||= {attributes:{}, values:{}}
      if(m[4]){
        original.items[ m[1] ][ parseInt(m[2]) ].attributes[ m[4] ] = value;
        if(value === "")delete original.items[ m[1] ][ parseInt(m[2]) ].attributes[ m[4] ];
      }
      if(m[5]){
        original.items[ m[1] ][ parseInt(m[2]) ].values[ m[6] || language ] ||= {};
        original.items[ m[1] ][ parseInt(m[2]) ].values[ m[6] || language ][ m[5] ] = value;
        if(value === "")delete original.items[ m[1] ][ parseInt(m[2]) ].values[ m[6] || language ][ m[5] ]
      }
    }

    //parse blocks
    m = name.match(/^#(\d+)([.@][\w+\[\].@|-]+)$/);
    if(m){
      original.blocks ||= [];
      original.blocks[ parseInt( m[1]) ] ||= {attributes:{}, values:{}, items:{}}

      const block = original.blocks[ parseInt(m[1]) ]
      this.update(block, m[2], value, language);
    }

    return original;
  }
}

module.exports = HelperPageText;