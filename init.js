const {KohanaJS} = require('kohanajs')
KohanaJS.initConfig(new Map([
  ['cms', require('./config/cms')],
]));
