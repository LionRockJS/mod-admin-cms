import {Central} from '@lionrockjs/central';
export default {
  uploadRoles: ['admin', 'staff', 'moderator'],
  timezone: '+0800',
  landing: '',
  databaseMap: new Map([
    ['draft', `${Central.APP_PATH}/../database/content.sqlite`],
    ['live', `${Central.APP_PATH}/../database/www/content.sqlite`],
    ['trash', `${Central.APP_PATH}/../database/trash/content.sqlite`],
    ['tag', `${Central.APP_PATH}/../database/www/tag.sqlite`],
  ]),  
  versionPath: `${Central.APP_PATH}/../database/versions`,
  defaultLanguage: 'en',
  languages: ['en', 'zh-hant'],
  blueprint: {
    default: ['@date', 'name', 'body', 'link__label', 'link__url', {items: ["name"]}],
    contact:['name', {position:['*company', 'name', 'address', 'title']}],
    company:['name', 'address'],
  },

  blocks: {
    default: ['@date', 'name', 'body', 'link__label', 'link__url', {items: ["name"]}],
    label: ['subject'],
    logos : ['label', {pictures:["url"]}],
    paragraphs:["subject", "body", "picture", "caption", "description"],
  },

  pageTypeSlugs: {
    default: ['pages', 'articles', 'posts']
  },

  blockLists : {
    default: ["default","label","logos","paragraphs"],
  },

  tagLists: {
    default: ['years', 'categories', 'topics', 'collections'],
  },
};