import HelperPageText from "./PageText.mjs";

export default class HelperPageEdit{
    static getProps(rawKey, prefix=""){
        const keyParts = rawKey.split(':');
        return {
            name: keyParts[0].replace(prefix,'').split('__')[0],
            type: keyParts[1] || 'text',
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
                    const pointers = rawPointers.map(it => this.getProps(it, '*'));
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
                pointers.push(this.getProps(it, '*'));
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

        const attributes = blueprint.filter(it => typeof it !== 'object').filter(it => /^@/.test(it)).map(it => it.substring(1));
        const pointers   = blueprint.filter(it => typeof it !== 'object').filter(it => /^\*/.test(it)).map(it => it.substring(1));
        const values     = blueprint.filter(it => typeof it !== 'object').filter(it => /^[^@*]/.test(it));
        const items      = blueprint.filter(it => typeof it === 'object')

        original.attributes = {_type:pageType, ...this.definitionInstance(attributes)};
        original.pointers = this.definitionInstance(pointers);
        original.values[defaultLanguage] = this.definitionInstance(values);

        items.forEach(item =>{
            const key = Object.keys(item)[0];
            const itemAttributes = item[key].filter(it=>/^@/.test(it)).map(it => it.substring(1));
            const itemPointers   = item[key].filter(it=>/^\*/.test(it)).map(it => it.substring(1));
            const itemValues     = item[key].filter(it => /^[^@*]/.test(it));

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
        original.blocks = [];

        Object.keys($_POST).forEach(name => {
            //parse attributes
            const value = $_POST[name];
//            if(value === "")return;

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

            //parse blocks

        });

        return original;
    }

    static update(original, name, value, language="en"){
        //parse attributes
        let m = name.match(/^@(\w+)$/);
        if(m){
            original.attributes[m[1]] = value;
            if(value === "")delete original.attributes[m[1]];
        }

        //parse pointers
        m = name.match(/^\*(\w+)$/)
        if(m){
            const key = '*'+m[1];
            original.pointers[key] = value;
            if(value === "")delete original.pointers[key];
        }

        //parse values
        m = name.match(/^\.(\w+)\|?([a-z-]+)?$/);
        if(m){
            original.values[ m[2] || language ] ||= {};
            original.values[ m[2] || language ][ m[1] ] = value;

            if(value === "")delete original.values[ m[2] || language ][ m[1] ];
        }

        //parse items
        m = name.match(/^\.(\w+)\[(\d+)\]([@*](\w+)$|\.(\w+)\|?([a-z-]+)?$|\*(\w+)$)/);
        if(m){
            original.items[ m[1] ] ||= [];
            original.items[ m[1] ][ parseInt(m[2]) ] ||= HelperPageText.defaultOriginalItem()
            const item = original.items[ m[1] ][ parseInt(m[2]) ];
            if(m[4]){
                item.attributes[ m[4] ] = value;
                if(value === "")delete item.attributes[ m[4] ];
            }

            if(m[7]){
                item.pointers[ m[7] ] = value;
                if(value === "")delete item.pointers[ m[7] ];
            }

            if(m[5]){
                item.values[ m[6] || language ] ||= {};
                item.values[ m[6] || language ][ m[5] ] = value;
                if(value === "")delete item.values[ m[6] || language ][ m[5] ]
            }
        }

        //parse blocks
        m = name.match(/^#(\d+)([.@*][\w+\[\].@*|-]+)$/);
        if(m){
            original.blocks ||= [];
            original.blocks[ parseInt( m[1]) ] ||= HelperPageText.defaultOriginal();

            const block = original.blocks[ parseInt(m[1]) ]
            this.update(block, m[2], value, language);
        }

        return original;
    }
}