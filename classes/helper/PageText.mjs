import {Central, Controller} from '@lionrockjs/central';
import fs from "node:fs";

  /**
   * Private helper class containing merge utility methods
   * @private
   */
class Merger {
    /**
     * Merges language-specific values from target and source objects
     */
    static mergeLanguageValues(targetValues = {}, sourceValues = {}) {
      const languageSet = new Set([...Object.keys(targetValues), ...Object.keys(sourceValues)]);
      const result = {};
      
      languageSet.forEach(language => {
        const targetLangValues = targetValues[language] || {};
        const sourceLangValues = sourceValues[language] || {};
        result[language] = {...targetLangValues, ...sourceLangValues};
      });
      
      return result;
    }
    
    /**
     * Merges basic properties (attributes and pointers) from target and source objects
     */
    static mergeBasicProps(target = {}, source = {}) {
      return {
        attributes: {...(target.attributes || {}), ...(source.attributes || {})},
        pointers: {...(target.pointers || {}), ...(source.pointers || {})}
      };
    }
    
    /**
     * Merges arrays of items, handling nested properties
     */
    static mergeItemArrays(targetItems = [], sourceItems = []) {
      const result = [];
      const length = Math.max(targetItems.length, sourceItems.length);
      
      for (let i = 0; i < length; i++) {
        const targetItem = targetItems[i];
        const sourceItem = sourceItems[i];
        
        // If one side is missing, use the other
        if (!targetItem && !sourceItem) {
          result.push(null);
          continue;
        }
        
        if (targetItem && !sourceItem) {
          result.push(targetItem);
          continue;
        }
        
        if (!targetItem && sourceItem) {
          result.push(sourceItem);
          continue;
        }
        
        // Merge the items
        const mergedItem = {
          ...this.mergeBasicProps(targetItem, sourceItem),
          values: this.mergeLanguageValues(targetItem.values, sourceItem.values)
        };
        
        // Handle nested items if they exist
        if (targetItem.items || sourceItem.items) {
          mergedItem.items = this.mergeItems(targetItem.items, sourceItem.items);
        }
        
        result.push(mergedItem);
      }
      
      return result.filter(item => !!item);
    }
    
    /**
     * Merges item collections from target and source objects
     */
    static mergeItems(targetItems = {}, sourceItems = {}) {
      const result = {};
      const itemTypes = new Set([...Object.keys(targetItems), ...Object.keys(sourceItems)]);
      
      itemTypes.forEach(itemType => {
        result[itemType] = this.mergeItemArrays(
          targetItems[itemType] || [],
          sourceItems[itemType] || []
        );
      });
      
      return result;
    }
  }

export default class HelperPageText{
  static defaultOriginal(){
    return {...this.defaultOriginalItem(),"items":{}};
  }

  static defaultOriginalItem(){
    return {"attributes":{},"pointers":{},"values":{}}
  }

  static getOriginal(page, attributes={}, state=new Map()){
    const version = state.get(Controller.STATE_QUERY)?.version;

    if(version){
      const versionFile = `${Central.config.cms.versionPath}/${page.id}/${version}.json`;
      if(fs.existsSync(versionFile)){
        return JSON.parse(fs.readFileSync(versionFile));
      }else{
        throw new Error(`Version ${version} not found`);
      }
    }

    if(!page.original)return this.defaultOriginal();

    const original = JSON.parse(page.original);
    Object.assign(original.attributes, attributes);

    return original;
  }

  /**
   * Merges two original objects by combining their properties
   */
  static mergeOriginals(target, source) {
    // Create default result structure
    const result = this.defaultOriginal();
    
    // Merge basic properties
    const basicProps = Merger.mergeBasicProps(target, source);
    result.attributes = basicProps.attributes;
    result.pointers = basicProps.pointers;
    
    // Merge language values
    result.values = Merger.mergeLanguageValues(target.values, source.values);
    
    // Merge items
    result.items = Merger.mergeItems(target.items, source.items);
    
    // Merge blocks if they exist
    if (target.blocks || source.blocks) {
      const targetBlocks = target.blocks || [];
      const sourceBlocks = source.blocks || [];
      
      // Use the same item merging logic for blocks
      result.blocks = Merger.mergeItemArrays(targetBlocks, sourceBlocks);
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