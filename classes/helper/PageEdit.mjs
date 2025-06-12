import {HelperPageText} from "@lionrockjs/mod-cms-read";
import fs from "node:fs";
import {Controller} from "@lionrockjs/mvc";

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

export default class HelperPageEdit{
    static getProps(rawKey, prefix=""){
        const keyParts = rawKey.split(':');
        return {
            name: keyParts[0].replace(prefix,'').split('__')[0],
            type: keyParts[1] || 'text',
        };
    }

    static getPointerProps(rawKey){
        const keyParts = rawKey.split(':');
        //if keyParts[0] matches @ or ., default type to 'page/field', else page/basic

        return {
            name: keyParts[0].replace("*",'').split('__')[0],
            type: keyParts[1] || ((/[.@]/.test(keyParts[0])) ? 'text': 'page/basic'),
        };
    }

    static get_blueprint_props(config_blueprint){
        //deep copy config
        const blueprint = JSON.parse(JSON.stringify(config_blueprint))

        const attributes = [];
        const fields = [];
        const items = [];
        const pointers = [];

        blueprint.forEach(it => {
            if(typeof it === 'object'){
                Object.keys(it).forEach(key => {
                    const rawAttributes = it[key].filter(it => /^@/.test(it));
                    const rawPointers = it[key].filter(it => /^\*/.test(it));
                    const rawFields = it[key].filter(it => /^[^@*]/.test(it));

                    const attributes = rawAttributes.map(it => this.getProps(it, '@'));
                    const pointers = rawPointers.map(it => this.getPointerProps(it));
                    const fields = rawFields.map(it => this.getProps(it));

                    items.push({
                        name: key,
                        attributes: attributes,
                        pointers: pointers,
                        fields: fields,
                    });
                });
            }else if(/^@/.test(it)){
                attributes.push(this.getProps(it, '@'));
            }else if(/^\*/.test(it)){
                pointers.push(this.getPointerProps(it));
            }else{
                fields.push(this.getProps(it));
            }
        });

        return{
            attributes,
            pointers,
            fields,
            items
        }
    }

    static definitionInstance(definitions=[]){
        const result = {};
        definitions.forEach(it => {result[it] = ""});
        return result;
    }

    static blueprint(pageType, blueprints={}, defaultLanguage="en"){
        const original = HelperPageText.defaultOriginal();
        original.values[defaultLanguage] = {};

        const blueprint = blueprints[pageType] ?? blueprints.default;
        if(!blueprint)return original;

        const attributes = blueprint.filter(it => typeof it !== 'object').filter(it => /^@/.test(it)).map(it => it.substring(1).split(":")[0]);
        const pointers   = blueprint.filter(it => typeof it !== 'object').filter(it => /^\*/.test(it)).map(it => it.substring(1).split(":")[0]);
        const values     = blueprint.filter(it => typeof it !== 'object').filter(it => /^[^@*]/.test(it)).map(it => it.split(":")[0]);
        const items      = blueprint.filter(it => typeof it === 'object')

        original.attributes = {_type:pageType, ...this.definitionInstance(attributes)};
        original.pointers = this.definitionInstance(pointers);
        original.values[defaultLanguage] = this.definitionInstance(values);

        items.forEach(item =>{
            const key = Object.keys(item)[0];
            const itemAttributes = item[key].filter(it=>/^@/.test(it)).map(it => it.substring(1).split(":")[0]);
            const itemPointers   = item[key].filter(it=>/^\*/.test(it)).map(it => it.substring(1).split(":")[0]);
            const itemValues     = item[key].filter(it => /^[^@*]/.test(it)).map(it => it.split(":")[0]);

            const defaultItem = HelperPageText.defaultOriginalItem();
            defaultItem.attributes._weight = 0;

            Object.assign(defaultItem.attributes, this.definitionInstance(itemAttributes));
            Object.assign(defaultItem.pointers, this.definitionInstance(itemPointers));
            defaultItem.values[defaultLanguage] = this.definitionInstance(itemValues);
            original.items[key] = [defaultItem];
        })

        return original;
    }

    static postToOriginal($_POST, langauge="en"){
        const original = HelperPageText.defaultOriginal();
        original.values[langauge] = {};

        const blockPosts = [];

        Object.keys($_POST).sort().forEach(name => {
            //parse attributes
            const value = $_POST[name];

            let m = name.match(/^@(\w+)$/);
            if(m){
                original.attributes[m[1]] = value;
                return;
            }

            //parse pointers
            m = name.match(/^\*(\w+)$/)
            if(m){
                const key = m[1];
                original.pointers[key] = value;
                return;
            }

            //parse values
            m = name.match(/^\.(\w+)\|?([a-z-]+)?$/);
            if(m){
                original.values[ m[2] || langauge ] ||= {};
                original.values[ m[2] || langauge ][ m[1] ] = value;
                return;
            }

            //parse items
            m = name.match(/^\.(\w+)\[(\d+)\](@(\w+)$|\.(\w+)\|?([a-z-]+)?$|\*(\w+)$)/);
            if(m){
                original.items[ m[1] ] ||= [];
                original.items[ m[1] ][ parseInt(m[2]) ] ||= HelperPageText.defaultOriginalItem();

                const item = original.items[ m[1] ][ parseInt(m[2]) ];

                if(m[4]){
                    item.attributes[ m[4] ] = value;
                    return;
                }

                if(m[5]){
                    item.values[ m[6] || langauge ] ||= {};
                    item.values[ m[6] || langauge ][ m[5] ] = value;
                    return;
                }

                if(m[7]){
                    item.pointers[ m[7] ] = value;
                    return;
                }
            }

            //collect blocks
            m = name.match(/^#(\d+)([.@*][\w+\[\].@*|-]+)$/);
            if(m){
                const key = parseInt(m[1]);
                blockPosts[ key ] ||= {};
                const post = blockPosts[ key ];
                post[m[2]] = value;
            }
        });

        //loop blockPosts and merge them into original.blocks
        original.blocks ||= [];
        blockPosts.forEach((post, index) => {
            original.blocks[index] = this.mergeOriginals(
              original.blocks[index] || HelperPageText.defaultOriginal(),
              this.postToOriginal(post, langauge)
            );
            delete original.blocks[index].blocks; //blocks should not be nested
        })

        return original;
    }

    /**
     * Merges two original objects by combining their properties
     */
    static mergeOriginals(target, source) {
        // Create default result structure
        const result = HelperPageText.defaultOriginal();

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

        if(!page.original)return HelperPageText.defaultOriginal();

        const original = JSON.parse(page.original);
        Object.assign(original.attributes, attributes);

        return original;
    }
}