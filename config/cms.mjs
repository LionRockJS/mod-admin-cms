import {Central} from '@lionrockjs/central';
export default {
  landing: '',
  databasePath: `${Central.APP_PATH}/../database`,
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