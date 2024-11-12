import {Central} from '@lionrockjs/central';
export default {
  landing: '',
  databasePath: `${Central.APP_PATH}/../database`,
  defaultLanguage: 'en',
  languages: ['en', 'zh-hant'],
  blueprint: {
    default: ['@date', 'name', 'body', 'link__label', 'link__url', {items: ["name"]}],
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