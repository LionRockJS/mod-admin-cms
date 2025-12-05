import HelperExcelParser from "../helper/ExcelParser.mjs";
import {Central, ORM} from "@lionrockjs/central";
import {HelperPageText} from "@lionrockjs/mod-cms-read";
import { createHash } from 'node:crypto';
import slugify from 'slugify';

export default class HelperImporter {
    static ACTION_NEW_ONLY = "new";
    static ACTION_APPEND_ONLY = "append";
    static ACTION_NEW_AND_APPEND = "new-append";
    static ACTION_OVERWRITE = "overwrite";
    static ACTION_FORCE_NEW = "force-new";

    static getUpdateSummary(safeFields, conflictFields = null, tagComparison = null){
        const summary = [];
        
        // Handle safe attributes (green)
        if (safeFields.attributes && safeFields.attributes.length > 0) {
            const attributeFields = safeFields.attributes.map(field => `<strong>${field.excelField}</strong>: ${field.excelValue}`);
            summary.push(`<div class="text-green-700">+ ${attributeFields.join(', ')}</div>`);
        }
        
        // Handle conflict attributes (red)
        if (conflictFields && conflictFields.attributes && conflictFields.attributes.length > 0) {
            const conflictAttributeFields = conflictFields.attributes.map(field => 
                `<strong>${field.excelField}</strong>: "${field.databaseValue}" → "${field.excelValue ?? ""}"`
            );
            summary.push(`<div class="text-red-700">${conflictAttributeFields.join(', ')}</div>`);
        }
        
        // Handle safe language-specific values (green)
        if (safeFields.values) {
            for (const language in safeFields.values) {
                const languageFields = safeFields.values[language];
                if (languageFields && languageFields.length > 0) {
                    const valueFields = languageFields.map(field => `<strong>${field.excelField}</strong>: "${field.excelValue}"`);
                    summary.push(`<div class="text-green-700">+ ${language.toUpperCase()}: ${valueFields.join(', ')}</div>`);
                }
            }
        }
        
        // Handle conflict language-specific values (red)
        if (conflictFields && conflictFields.values) {
            for (const language in conflictFields.values) {
                const languageFields = conflictFields.values[language];
                if (languageFields && languageFields.length > 0) {
                    const conflictValueFields = languageFields.map(field => 
                        `<strong>${field.excelField}</strong>: "${field.databaseValue}" → "${field.excelValue ?? ""}"`
                    );
                    summary.push(`<div class="text-red-700">${language.toUpperCase()}: ${conflictValueFields.join(', ')}</div>`);
                }
            }
        }
        
        // Handle safe items (green)
        if (safeFields.items) {
            for (const itemType in safeFields.items) {
                const itemFields = safeFields.items[itemType];
                if (itemFields && itemFields.length > 0) {
                    // Group fields by itemIndex
                    const fieldsByIndex = {};
                    itemFields.forEach(field => {
                        const index = field.itemIndex === -1 ? 'new' : field.itemIndex;
                        if (!fieldsByIndex[index]) fieldsByIndex[index] = [];
                        fieldsByIndex[index].push(`<strong>${field.excelField}</strong>: "${field.excelValue}"`);
                    });
                    
                    // Create summary for each index
                    for (const index in fieldsByIndex) {
                        const indexLabel = index === 'new' ? 'new item' : `item ${parseInt(index) + 1}`;
                        summary.push(`<div class="text-green-700">+ ${itemType} (${indexLabel}): ${fieldsByIndex[index].join(', ')}</div>`);
                    }
                }
            }
        }
        
        // Handle conflict items (red)
        if (conflictFields && conflictFields.items) {
            for (const itemType in conflictFields.items) {
                const itemFields = conflictFields.items[itemType];
                if (itemFields && itemFields.length > 0) {
                    // Group fields by itemIndex
                    const fieldsByIndex = {};
                    itemFields.forEach(field => {
                        const index = field.itemIndex;
                        if (!fieldsByIndex[index]) fieldsByIndex[index] = [];
                        fieldsByIndex[index].push(`<strong>${field.excelField}</strong>: "${field.databaseValue}" → "${field.excelValue ?? ""}"`);
                    });
                    
                    // Create summary for each index
                    for (const index in fieldsByIndex) {
                        const indexLabel = `item ${parseInt(index) + 1}`;
                        summary.push(`<div class="text-red-700">${itemType} (${indexLabel}): ${fieldsByIndex[index].join(', ')}</div>`);
                    }
                }
            }
        }
        
        // Handle safe tags to append (green)
        if (tagComparison && tagComparison.safeToAppend && tagComparison.safeToAppend.length > 0) {
            const tagsByType = {};
            tagComparison.safeToAppend.forEach(tag => {
                if (!tagsByType[tag.tagTypeName]) tagsByType[tag.tagTypeName] = [];
                tagsByType[tag.tagTypeName].push(tag.excelValue);
            });
            
            for (const tagType in tagsByType) {
                const tagValues = tagsByType[tagType].map(value => `"${value}"`);
                summary.push(`<div class="text-green-700">+ Tags (${tagType}): ${tagValues.join(', ')}</div>`);
            }
        }
        
        // Handle tag conflicts (red)
        if (tagComparison && tagComparison.conflicts && tagComparison.conflicts.length > 0) {
            tagComparison.conflicts.forEach(conflict => {
                const excelValues = conflict.excelValues.map(value => `"${value}"`).join(', ');
                const missingValues = conflict.missingFromExcel.map(value => `"${value}"`).join(', ');
                summary.push(`<div class="text-red-700">Tags (${conflict.tagTypeName}): Excel has ${excelValues}, missing ${missingValues}</div>`);
            });
        }
        
        return summary.length > 0 ? summary.join('\n') : 'No update';
    }

    // Shared method: Validate file and find duplicates
    static async validateFile(file, database,
        uniqueDigestHandler = (item, digest) =>{},
        findExistingRecord = async (item, database) => {},
        configImporter = {attributes:[],values: {},items:[], tags:[]},
    ) {
        const {headers, objects} = await HelperExcelParser.parseExcelToObjects(file);

        //check object duplication by id
        const duplicatedObjects = [];
        const conflictedObjects = [];
        const duplicatedRow = [];
        const ids = new Map();

        for (let i = 0; i < objects.length; i++) {
            const item = objects[i];
            const digest = await createHash('md5').update(JSON.stringify(item)).digest('hex');//md5
            const uniqueDigest = uniqueDigestHandler(item, digest);
            const exist = ids.get(uniqueDigest);

            if (!exist) {
                ids.set(uniqueDigest, item);
                continue;
            }

            let conflict = false;
            for (const key in item) {
                if (item[key] !== exist[key]) {
                    conflictedObjects.push(item);
                    conflict = true;
                    break;
                }
            }

            if (conflict) continue;
            duplicatedRow.push(i);
            duplicatedObjects.push(item);
        }

        const duplicated = [];
        const added = [];
        const safeImportAnalysis = [];
        const importObjects = [...ids.values()];
        for (const item of importObjects) {
            const existingRecord = await findExistingRecord(item, database);
            if (existingRecord) {
                duplicated.push(item);
                const safeFields = this.findSafeImportFields(existingRecord, item, configImporter);
                const conflictFields = this.findConflictImportFields(existingRecord, item, configImporter);
                
                // Compare tags if tag mappings are configured
                let tagComparison = { safeToAppend: [], conflicts: [] };
                if (configImporter.tags && configImporter.tags.length > 0) {
                    tagComparison = this.compareTagsWithDatabase(existingRecord, item, configImporter.tags);
                }
                
                safeImportAnalysis.push({
                    excelData: item,
                    databaseRecord: existingRecord,
                    safeFields: safeFields,
                    conflictFields: conflictFields,
                    tagComparison: tagComparison
                });

                item.__record = existingRecord;
                item.__safeFields = safeFields;
                item.__tagComparison = tagComparison;
                item.__updateSummary = this.getUpdateSummary(safeFields, conflictFields, tagComparison);
            } else {
                added.push(item);
            }
        }

        return {
            headers,
            objects,
            duplicatedObjects,
            duplicatedRow,
            conflictedObjects,
            importObjects,
            duplicated,
            added,
            safeImportAnalysis,
            configImporter
        }
    }

    // Shared method: Assign attributes with optional trimming
    static assignAttributes(original, item, keys, shouldTrim = true) {
        keys.forEach(key => {
            if (Array.isArray(key)) {
                // Skip if column doesn't exist in upload file
                if (!(key[0] in item)) return;
                if (!original.attributes[key[1]] && !item[key[0]]) return;
                original.attributes[key[1]] = shouldTrim ? String(item[key[0]] ?? "").trim() : item[key[0]];
            } else {
                // Skip if column doesn't exist in upload file
                if (!(key in item)) return;
                if (!original.attributes[key] && !item[key]) return;
                original.attributes[key] = shouldTrim ? String(item[key] ?? "").trim() : item[key];
            }
        })
    }

    // Shared method: Assign values with optional trimming and fallback
    static assignValues(original, item, keys, shouldTrim = true, fallback = "") {
        const valueKeys = Object.keys(keys);
        //find languages in keys
        valueKeys.forEach(key => {
            // Skip if column doesn't exist in upload file
            if (!(key in item)) return;
            
            const language = Object.keys(keys[key])[0];
            const targetKey = keys[key][language];

            original.values[language] ||= {};
            if (!original.values[language][targetKey] && !item[key]) {
//                if (fallback) original.values[language][targetKey] = fallback;
                return;
            }
            const value = shouldTrim ? String(item[key] ?? "").trim() : item[key];
            original.values[language][targetKey] = value || fallback;
        });
    }

    // Shared method: Deep copy utility
    static recursiveDeepCopy(o) {
        let newO, i;

        if (typeof o !== 'object') {
            return o;
        }
        if (!o) {
            return o;
        }

        if ('[object Array]' === Object.prototype.toString.apply(o)) {
            newO = [];
            for (i = 0; i < o.length; i += 1) {
                newO[i] = this.recursiveDeepCopy(o[i]);
            }
            return newO;
        }

        newO = {};
        for (i in o) {
            if (o.hasOwnProperty(i)) {
                newO[i] = this.recursiveDeepCopy(o[i]);
            }
        }
        return newO;
    }

    // Shared method: Assign items with optional trimming and fallback
    static assignItems(original, item, configs, shouldTrim = true, fallback = "") {
        configs.forEach(
            config => {
                const netItemType = Object.keys(config)[0];
                const defaultValue = this.recursiveDeepCopy(config[netItemType].filter(it => typeof it === 'object' && !Array.isArray(it))[0] || {});
                let changed = false;

                const newItem = Object.assign({
                    attributes: {_weight: 0},
                    values: {}
                }, defaultValue);

                //process
                config[netItemType].forEach(it => {
                    if (typeof it === 'string') {
                        // if it is a string, it is a direct attribute
                        // Skip if column doesn't exist in upload file
                        if (!(it in item)) return;
                        if (!item[it]) return;
                        const value = shouldTrim ? String(item[it]).trim() : item[it];
                        newItem.attributes[it] = value || fallback;
                        changed = true;
                    } else if (Array.isArray(it)) {
                        // if it is an array, it is a mapping from source to target
                        const [sourceKey, targetKey] = it;
                        // Skip if column doesn't exist in upload file
                        if (!(sourceKey in item)) return;
                        if (!item[sourceKey]) return;// no data in source cell, skip

                        //if targetKey is a string, it is a direct attribute
                        if (typeof targetKey === 'string') {
                            const value = shouldTrim ? String(item[sourceKey]).trim() : item[sourceKey];
                            newItem.attributes[targetKey] = value || fallback;
                            changed = true;
                        }

                        //if targetKey is an object, it is a mapping to a language value
                        if (typeof targetKey === 'object') {
                            const language = Object.keys(targetKey)[0];
                            if (!newItem.values[language]) {
                                newItem.values[language] = {};
                            }
                            const value = shouldTrim ? String(item[sourceKey]).trim() : item[sourceKey];
                            newItem.values[language][targetKey[language]] = value || fallback;
                            changed = true;
                        }
                    }
                });

                if (!changed) return;

                original.items[netItemType] ||= [];
                const existItem = original.items[netItemType];

                if (existItem.length > 0) {
                    //check if item already exists
                    existItem.forEach(it => {
                        if (this.compareItems(newItem, it)) changed = false;
                    });
                }
                if (!changed) return; // item already exists, skip

                original.items[netItemType].push(newItem)
            }
        )
    }

    // Shared method: Compare items for equality
    static compareItems(obj1, obj2) {
        //check attributes match
        if (Object.keys(obj1.attributes).length !== Object.keys(obj2.attributes).length) return false;
        for (const key in obj1.attributes) {
            if (obj1.attributes[key] !== obj2.attributes[key]) {
                return false;
            }
        }

        //check values match
        const defaultLanguage = Central.config.cms.defaultLanguage;
        if (!obj1.values[defaultLanguage] || !obj2.values[defaultLanguage]) return true;

        if (Object.keys(obj1.values[defaultLanguage]).length !== Object.keys(obj2.values[defaultLanguage]).length) return false;
        for (const key in obj1.values[defaultLanguage]) {
            if (obj1.values[defaultLanguage][key] !== obj2.values[defaultLanguage][key]) {
                return false;
            }
        }

        return true;
    }

    // Shared method: Import file with validation
    static async importFile(file, database, Model,
        configImporter = {attributes:[],values: {},items:[]},
        validateFile = this.validateFile,
        findExistingRecord = async (item, database)=>{},
        handler = async (original, item, autoId) => {},
        action = HelperImporter.ACTION_NEW_AND_APPEND
    ) {
        const {added, duplicated} = await validateFile(file, database);
        let insertID = Date.now(); //to avoid conflict with existing IDs
        
        //add ORM to results
        for (const item of added) {
            insertID = insertID + 1 + Math.floor(Math.random() * 1000);
            item.__insertID = insertID;
            item.__instance = ORM.create(Model, {database, insertID : String(insertID)});
        }

        for (const item of duplicated) {
            if(action === this.ACTION_FORCE_NEW){
                insertID = insertID + 1 + Math.floor(Math.random() * 1000);
                item.__instance = ORM.create(Model, {database, insertID : String(insertID)});
            }else{
                item.__instance = await findExistingRecord(item, database);
            }
        }

        const autoId = {id: insertID};
        if(action === this.ACTION_NEW_ONLY || action === this.ACTION_NEW_AND_APPEND) {
            for (const item of added) {
                const instance = item.__instance;
                const original = HelperPageText.getOriginal(instance);

                if (configImporter.attributes) this.assignAttributes(original, item, configImporter.attributes);
                if (configImporter.values) this.assignValues(original, item, configImporter.values);
                if (configImporter.items) this.assignItems(original, item, configImporter.items);

                await handler(original, item, autoId);
                instance.original = JSON.stringify(original);
                await instance.write();
            }
        }

        if(action === this.ACTION_APPEND_ONLY || action === this.ACTION_NEW_AND_APPEND){
            for (const item of duplicated) {
                // Apply safe import for existing records
                // Skip if no safe fields and no safe tags to import
                const hasSafeTags = item.__tagComparison && item.__tagComparison.safeToAppend && item.__tagComparison.safeToAppend.length > 0;
                if (!item.__safeFields && !hasSafeTags) continue;

                const instance = item.__instance;
                const original = HelperPageText.getOriginal(instance);
                let hasChanges = false;

                // Apply safe attributes
                if (item.__safeFields && item.__safeFields.attributes && item.__safeFields.attributes.length > 0) {
                    item.__safeFields.attributes.forEach(field => {
                        original.attributes[field.dbField] = field.excelValue;
                        hasChanges = true;
                    });
                }

                // Apply safe values (language-specific)
                if (item.__safeFields && item.__safeFields.values) {
                    for (const language in item.__safeFields.values) {
                        const languageFields = item.__safeFields.values[language];
                        if (languageFields && languageFields.length > 0) {
                            if (!original.values[language]) {
                                original.values[language] = {};
                            }
                            languageFields.forEach(field => {
                                original.values[language][field.dbField] = field.excelValue;
                                hasChanges = true;
                            });
                        }
                    }
                }

                // Apply safe items
                if (item.__safeFields && item.__safeFields.items) {
                    for (const itemType in item.__safeFields.items) {
                        const itemFields = item.__safeFields.items[itemType];
                        if (itemFields && itemFields.length > 0) {
                            if (!original.items[itemType]) {
                                original.items[itemType] = [];
                            }

                            // Group fields by itemIndex to handle multiple fields for the same item
                            const fieldsByIndex = {};
                            itemFields.forEach(field => {
                                const index = field.itemIndex;
                                if (!fieldsByIndex[index]) fieldsByIndex[index] = [];
                                fieldsByIndex[index].push(field);
                            });

                            // Process each item index
                            for (const index in fieldsByIndex) {
                                const indexNum = parseInt(index);
                                const fields = fieldsByIndex[index];

                                // Ensure item exists at this index
                                while (original.items[itemType].length <= indexNum) {
                                    original.items[itemType].push({
                                        attributes: { _weight: 0 },
                                        values: {}
                                    });
                                }

                                const targetItem = original.items[itemType][indexNum];

                                // Apply each field to the target item
                                fields.forEach(field => {
                                    if (typeof field.dbField === 'string') {
                                        // Direct attribute
                                        if (!targetItem.attributes) targetItem.attributes = {};
                                        targetItem.attributes[field.dbField] = field.excelValue;
                                        hasChanges = true;
                                    } else if (typeof field.dbField === 'object') {
                                        // Language-specific value
                                        const language = Object.keys(field.dbField)[0];
                                        const fieldKey = field.dbField[language];

                                        if (!targetItem.values) targetItem.values = {};
                                        if (!targetItem.values[language]) targetItem.values[language] = {};
                                        targetItem.values[language][fieldKey] = field.excelValue;
                                        hasChanges = true;
                                    }
                                });
                            }
                        }
                    }
                }

                // Check if there are safe tags to append
                if (item.__tagComparison && item.__tagComparison.safeToAppend && item.__tagComparison.safeToAppend.length > 0) {
                    hasChanges = true;
                }

                // Save changes if any were made (including tags)
                if (hasChanges) {
                    await handler(original, item, autoId);
                    instance.original = JSON.stringify(original);
                    await instance.write();
                }
            }
        }

        if(action === this.ACTION_OVERWRITE || action === this.ACTION_FORCE_NEW){
            for (const item of duplicated) {
                if (!item.__safeFields && !item.__conflictFields) continue; // Skip if no safe fields to import
                const instance = item.__instance;
                const original = HelperPageText.getOriginal(instance);

                if (configImporter.attributes) this.assignAttributes(original, item, configImporter.attributes);
                if (configImporter.values) this.assignValues(original, item, configImporter.values);
                if (configImporter.items) this.assignItems(original, item, configImporter.items);

                await handler(original, item, autoId);
                instance.original = JSON.stringify(original);
                await instance.write();
            }
        }
    }

    // New method: Find fields safe to import (empty in database but have data in Excel)
    static findSafeImportFields(databaseRecord, excelData, configImporter = {attributes:[],values: {},items:[]}) {
        const safeFields = {
            attributes: [],
            values: {},
            items: {}
        };

        // Parse database record's original JSON
        const dbOriginal = typeof databaseRecord.original === 'string' 
            ? JSON.parse(databaseRecord.original) 
            : databaseRecord.original;

        // Check attributes using config mapping
        if (configImporter.attributes && dbOriginal.attributes) {
            configImporter.attributes.forEach(key => {
                let excelKey, dbKey;
                
                if (Array.isArray(key)) {
                    excelKey = key[0];
                    dbKey = key[1];
                } else {
                    excelKey = key;
                    dbKey = key;
                }
                
                const excelValue = excelData[excelKey];
                const dbValue = dbOriginal.attributes[dbKey];
                
                // Skip if column doesn't exist in Excel file (not uploaded)
                if (!(excelKey in excelData)) return;
                
                // Field is safe to import if database field is empty/null but Excel has data
                if (this.isEmpty(dbValue) && !this.isEmpty(excelValue)) {
                    safeFields.attributes.push({
                        excelField: excelKey,
                        dbField: dbKey,
                        databaseValue: dbValue,
                        excelValue: excelValue
                    });
                }
            });
        }

        // Check language-specific values using config mapping
        if (configImporter.values && dbOriginal.values) {
            const valueKeys = Object.keys(configImporter.values);
            
            valueKeys.forEach(excelKey => {
                // Skip if column doesn't exist in Excel file (not uploaded)
                if (!(excelKey in excelData)) return;
                
                const excelValue = excelData[excelKey];
                if (this.isEmpty(excelValue)) return;
                
                const language = Object.keys(configImporter.values[excelKey])[0];
                const dbKey = configImporter.values[excelKey][language];
                
                const dbValue = dbOriginal.values[language] && dbOriginal.values[language][dbKey];
                
                if (this.isEmpty(dbValue) && !this.isEmpty(excelValue)) {
                    if (!safeFields.values[language]) {
                        safeFields.values[language] = [];
                    }
                    safeFields.values[language].push({
                        excelField: excelKey,
                        dbField: dbKey,
                        databaseValue: dbValue,
                        excelValue: excelValue
                    });
                }
            });
        }

        // Check items using config mapping
        if (configImporter.items && dbOriginal.items) {
            configImporter.items.forEach((config, configIndex) => {
                const itemType = Object.keys(config)[0];
                const dbItems = dbOriginal.items[itemType] || [];
                
                config[itemType].forEach(it => {
                    // Skip default objects
                    if (typeof it === 'object' && !Array.isArray(it)) return;
                    
                    let excelKey, dbKey;
                    
                    if (typeof it === 'string') {
                        excelKey = it;
                        dbKey = it;
                    } else if (Array.isArray(it)) {
                        excelKey = it[0];
                        dbKey = it[1];
                    } else {
                        return;
                    }
                    
                    const excelValue = excelData[excelKey];
                    
                    // Skip if column doesn't exist in Excel file (not uploaded)
                    if (!(excelKey in excelData)) return;
                    if (this.isEmpty(excelValue)) return;
                    
                    // Extract field index from field names like client_name_1, work_phone_1_direct, assistants_1_work_phone, etc.
                    const fieldIndexMatch = excelKey.match(/_([0-9]+)(_|$)/);
                    let targetItemIndex;
                    
                    let canSafelyImport = false;
                    let dbValue;
                    
                    if (fieldIndexMatch) {
                        // Field has an index number (like _1, _2), map to that specific item position
                        targetItemIndex = parseInt(fieldIndexMatch[1]) - 1; // Convert 1-based to 0-based
                        
                        if (targetItemIndex < dbItems.length) {
                            const dbItem = dbItems[targetItemIndex];
                            
                            if (typeof dbKey === 'string') {
                                dbValue = dbItem.attributes && dbItem.attributes[dbKey];
                            } else if (typeof dbKey === 'object') {
                                // Handle language-specific values in items
                                const language = Object.keys(dbKey)[0];
                                const fieldKey = dbKey[language];
                                dbValue = dbItem.values && dbItem.values[language] && dbItem.values[language][fieldKey];
                            }
                            
                            if (this.isEmpty(dbValue)) {
                                canSafelyImport = true;
                            }
                        } else {
                            // Target item doesn't exist, can create new item at the specified position
                            canSafelyImport = true;
                            dbValue = null;
                        }
                    } else {
                        // Field has no index number, default to itemIndex 0
                        targetItemIndex = 0;
                        
                        if (targetItemIndex < dbItems.length) {
                            const dbItem = dbItems[targetItemIndex];
                            
                            if (typeof dbKey === 'string') {
                                dbValue = dbItem.attributes && dbItem.attributes[dbKey];
                            } else if (typeof dbKey === 'object') {
                                // Handle language-specific values in items
                                const language = Object.keys(dbKey)[0];
                                const fieldKey = dbKey[language];
                                dbValue = dbItem.values && dbItem.values[language] && dbItem.values[language][fieldKey];
                            }
                            
                            if (this.isEmpty(dbValue)) {
                                canSafelyImport = true;
                            }
                        } else {
                            // Target item doesn't exist, can create new item at position 0
                            canSafelyImport = true;
                            dbValue = null;
                        }
                    }
                    
                    if (canSafelyImport) {
                        if (!safeFields.items[itemType]) {
                            safeFields.items[itemType] = [];
                        }
                        safeFields.items[itemType].push({
                            excelField: excelKey,
                            dbField: dbKey,
                            itemIndex: targetItemIndex,
                            databaseValue: dbValue,
                            excelValue: excelValue
                        });
                    }
                });
            });
        }

        return safeFields;
    }

    // New method: Find fields that conflict (database has data different from Excel)
    static findConflictImportFields(databaseRecord, excelData, configImporter = {attributes:[],values: {},items:[]}) {
        const conflictFields = {
            attributes: [],
            values: {},
            items: {}
        };

        // Parse database record's original JSON
        const dbOriginal = typeof databaseRecord.original === 'string' 
            ? JSON.parse(databaseRecord.original) 
            : databaseRecord.original;

        // Check attributes using config mapping
        if (configImporter.attributes && dbOriginal.attributes) {
            configImporter.attributes.forEach(key => {
                let excelKey, dbKey;
                
                if (Array.isArray(key)) {
                    excelKey = key[0];
                    dbKey = key[1];
                } else {
                    excelKey = key;
                    dbKey = key;
                }
                
                const excelValue = excelData[excelKey];
                const dbValue = dbOriginal.attributes[dbKey];
                
                // Skip if column doesn't exist in Excel file (not uploaded)
                if (!(excelKey in excelData)) return;
                
                // Field is conflicted if:
                // 1. Database has data but Excel is empty (potential data loss)
                // 2. Both have data but they are different (data overwrite)
                if (!this.isEmpty(dbValue) && 
                    (this.isEmpty(excelValue) || !this.valuesAreEqual(dbValue, excelValue))) {
                    conflictFields.attributes.push({
                        excelField: excelKey,
                        dbField: dbKey,
                        databaseValue: dbValue,
                        excelValue: excelValue
                    });
                }
            });
        }

        // Check language-specific values using config mapping
        if (configImporter.values && dbOriginal.values) {
            const valueKeys = Object.keys(configImporter.values);
            
            valueKeys.forEach(excelKey => {
                const excelValue = excelData[excelKey];
                
                // Skip if column doesn't exist in Excel file (not uploaded)
                if (!(excelKey in excelData)) return;
                
                const language = Object.keys(configImporter.values[excelKey])[0];
                const dbKey = configImporter.values[excelKey][language];
                
                const dbValue = dbOriginal.values[language] && dbOriginal.values[language][dbKey];
                
                // Field is conflicted if:
                // 1. Database has data but Excel is empty (potential data loss)
                // 2. Both have data but they are different (data overwrite)
                if (!this.isEmpty(dbValue) && 
                    (this.isEmpty(excelValue) || !this.valuesAreEqual(dbValue, excelValue))) {
                    if (!conflictFields.values[language]) {
                        conflictFields.values[language] = [];
                    }
                    conflictFields.values[language].push({
                        excelField: excelKey,
                        dbField: dbKey,
                        databaseValue: dbValue,
                        excelValue: excelValue
                    });
                }
            });
        }

        // Check items using config mapping
        if (configImporter.items && dbOriginal.items) {
            configImporter.items.forEach((config, configIndex) => {
                const itemType = Object.keys(config)[0];
                const dbItems = dbOriginal.items[itemType] || [];
                
                config[itemType].forEach(it => {
                    // Skip default objects
                    if (typeof it === 'object' && !Array.isArray(it)) return;
                    
                    let excelKey, dbKey;
                    
                    if (typeof it === 'string') {
                        excelKey = it;
                        dbKey = it;
                    } else if (Array.isArray(it)) {
                        excelKey = it[0];
                        dbKey = it[1];
                    } else {
                        return;
                    }
                    
                    const excelValue = excelData[excelKey];
                    
                    // Skip if column doesn't exist in Excel file (not uploaded)
                    if (!(excelKey in excelData)) return;
                    
                    // Extract field index from field names like client_name_1, work_phone_1_direct, assistants_1_work_phone, etc.
                    const fieldIndexMatch = excelKey.match(/_(\d+)(_|$)/);
                    let targetItemIndex;
                    
                    let hasConflict = false;
                    let dbValue;
                    
                    if (fieldIndexMatch) {
                        // Field has an index number (like _1, _2), map to that specific item position
                        targetItemIndex = parseInt(fieldIndexMatch[1]) - 1; // Convert 1-based to 0-based
                        
                        if (targetItemIndex < dbItems.length) {
                            const dbItem = dbItems[targetItemIndex];
                            
                            if (typeof dbKey === 'string') {
                                dbValue = dbItem.attributes && dbItem.attributes[dbKey];
                            } else if (typeof dbKey === 'object') {
                                // Handle language-specific values in items
                                const language = Object.keys(dbKey)[0];
                                const fieldKey = dbKey[language];
                                dbValue = dbItem.values && dbItem.values[language] && dbItem.values[language][fieldKey];
                            }
                            
                            // Check for conflict:
                            // 1. Database has data but Excel is empty (potential data loss)
                            // 2. Both have data but they are different (data overwrite)
                            if (!this.isEmpty(dbValue) && 
                                (this.isEmpty(excelValue) || !this.valuesAreEqual(dbValue, excelValue))) {
                                hasConflict = true;
                            }
                        }
                        // If item doesn't exist at that index, no conflict (would create new item)
                    } else {
                        // Field has no index number, default to itemIndex 0
                        targetItemIndex = 0;
                        
                        if (targetItemIndex < dbItems.length) {
                            const dbItem = dbItems[targetItemIndex];
                            
                            if (typeof dbKey === 'string') {
                                dbValue = dbItem.attributes && dbItem.attributes[dbKey];
                            } else if (typeof dbKey === 'object') {
                                // Handle language-specific values in items
                                const language = Object.keys(dbKey)[0];
                                const fieldKey = dbKey[language];
                                dbValue = dbItem.values && dbItem.values[language] && dbItem.values[language][fieldKey];
                            }
                            
                            // Check for conflict:
                            // 1. Database has data but Excel is empty (potential data loss)
                            // 2. Both have data but they are different (data overwrite)
                            if (!this.isEmpty(dbValue) && 
                                (this.isEmpty(excelValue) || !this.valuesAreEqual(dbValue, excelValue))) {
                                hasConflict = true;
                            }
                        }
                        // If item doesn't exist at position 0, no conflict (would create new item)
                    }
                    
                    if (hasConflict) {
                        if (!conflictFields.items[itemType]) {
                            conflictFields.items[itemType] = [];
                        }
                        conflictFields.items[itemType].push({
                            excelField: excelKey,
                            dbField: dbKey,
                            itemIndex: targetItemIndex,
                            databaseValue: dbValue,
                            excelValue: excelValue
                        });
                    }
                });
            });
        }

        return conflictFields;
    }

    // Helper method: Check if a value is empty/null/undefined
    static isEmpty(value) {
        return value === null || 
               value === undefined || 
               value === '' || 
               (typeof value === 'string' && value.trim() === '');
    }

    // Helper method: Compare values with case insensitive comparison for short values
    static valuesAreEqual(dbValue, excelValue) {
        const dbStr = String(dbValue).trim();
        const excelStr = String(excelValue).trim();
        
        // If both values are shorter than 5 characters, do case insensitive comparison
        if (dbStr.length < 5 && excelStr.length < 5) {
            return dbStr.toLowerCase() === excelStr.toLowerCase();
        }
        
        // Otherwise, do case sensitive comparison
        return dbStr === excelStr;
    }

    /**
     * Compare tags from Excel with existing database tags to determine if they can be safely appended or if there are conflicts
     * @param {Object} databaseRecord - The existing database record (with tags grouped by type)
     * @param {Object} excelData - The Excel data row
     * @param {Array} tagMappings - Tag mapping configuration from importer config (e.g., [['excel_field', 'tag_type_name']])
     * @returns {Object} Object with safeToAppend and conflicts arrays
     */
    static compareTagsWithDatabase(databaseRecord, excelData, tagMappings) {
        if (!tagMappings || tagMappings.length === 0) {
            return { safeToAppend: [], conflicts: [] };
        }

        const safeToAppend = [];
        const conflicts = [];

        // Get existing tags grouped by type from database record
        const existingTagsByType = databaseRecord.tags || {};

        // Process each tag mapping
        for (const tagMapping of tagMappings) {
            const [excelField, tagTypeName] = tagMapping;
            
            // Skip if column doesn't exist in Excel file (not uploaded)
            if (!(excelField in excelData)) {
                continue;
            }
            
            const excelTagData = excelData[excelField];
            
            // Skip if no Excel data for this field
            if (this.isEmpty(excelTagData)) {
                continue;
            }

            // Parse Excel tag values (semicolon-separated)
            const excelTagValues = excelTagData.split(';')
                .map(it => it.trim())
                .filter(it => it)
                .map(tagValue => ({
                    originalValue: tagValue,
                    slug: slugify(tagValue, { lower: true, strict: true })
                }));

            if (excelTagValues.length === 0) {
                continue;
            }

            // Get existing tags for this tag type
            const existingTagsForType = existingTagsByType[tagTypeName] || [];
            const existingTagSlugs = new Set(existingTagsForType);

            // Check each Excel tag value
            for (const excelTag of excelTagValues) {
                const tagComparison = {
                    excelField,
                    tagTypeName,
                    excelValue: excelTag.originalValue,
                    tagSlug: excelTag.slug
                };

                if (existingTagsForType.length === 0) {
                    // No existing tags for this tag type - safe to append
                    safeToAppend.push({
                        ...tagComparison,
                        reason: 'no_existing_tags'
                    });
                } else if (existingTagSlugs.has(excelTag.slug)) {
                    // Tag already exists - skip (no change will occur, no need to show in summary)
                    continue;
                } else {
                    // Tag type has existing tags but this specific tag doesn't exist
                    // This could be considered a conflict or safe depending on business rules
                    // For now, we'll mark it as safe to append since it's adding new tags to existing type
                    safeToAppend.push({
                        ...tagComparison,
                        reason: 'new_tag_to_existing_type',
                        existingTags: existingTagsForType
                    });
                }
            }

            // Check for conflicts: if Excel has fewer tags than database for the same type
            // This might indicate data loss if we're doing an overwrite operation
            if (existingTagsForType.length > 0 && excelTagValues.length > 0) {
                const excelTagSlugs = new Set(excelTagValues.map(tag => tag.slug));
                const missingFromExcel = existingTagsForType.filter(dbTag => !excelTagSlugs.has(dbTag));
                
                if (missingFromExcel.length > 0) {
                    conflicts.push({
                        excelField,
                        tagTypeName,
                        excelValues: excelTagValues.map(tag => tag.originalValue),
                        databaseTags: existingTagsForType,
                        missingFromExcel: missingFromExcel,
                        reason: 'potential_data_loss'
                    });
                }
            }
        }

        return { safeToAppend, conflicts };
    }

}
