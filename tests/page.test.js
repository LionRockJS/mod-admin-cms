const HelperPageText = require('../classes/helper/PageText');

const blueprint = {
  pages: [
    '@city',
    'name', 'body', 'link__label', 'link__url',
    {todo: ['@price','body', 'link__label', 'link__url']}
  ],
  poster:[
    '@location', 'slogan',{range:["@price", "name"]}
  ]
};

describe('page helper test', () => {
  test('get blueprint original', async()=>{
    expect(JSON.stringify(HelperPageText.blueprint('pages', blueprint)))
      .toBe(JSON.stringify({
        attributes:{
          _type: "pages",
          city: ""
        },
        values:{
          en:{name: "", body: "", link__label : "", link__url : ""}
        },
        items:{
          todo:[
            {
              attributes:{_weight: 0, price:""},
              values:{en:{body:"", link__label: "", link__url: ""}}
            }
          ]
        }
      }));
  })

  test('regexp', ()=>{
    const reAttribute = /^@(\w+)$/
    expect(".name".match(reAttribute)).toBe(null);
    expect("@name|".match(reAttribute)).toBe(null);
    expect("@name".match(reAttribute)).not.toBe(null);
    expect("@name".match(reAttribute)[1]).toBe("name");
    expect("@_type".match(reAttribute)[1]).toBe("_type");

    const reValue = /^\.(\w+)\|?([a-z-]+)?$/
    expect("@name".match(reValue)).toBe(null);
    expect(".name".match(reValue)).not.toBe(null);
    expect(".name".match(reValue)[1]).toBe("name");
    expect(".name".match(reValue)[2]).toBe(undefined);
    expect(".name|".match(reValue)[1]).toBe("name");
    expect(".name|en".match(reValue)[2]).toBe("en");
    expect(".name|zh-hant".match(reValue)[2]).toBe("zh-hant");
    expect(".name|zh-hans".match(reValue)[2]).toBe("zh-hans");

    const reItems = /^\.(\w+)\[(\d+)\](@(\w+)$|\.(\w+)\|?([a-z-]+)?$)/;
    expect("@name".match(reItems)).toBe(null);
    expect(".name".match(reItems)).toBe(null);
    expect(".todo[0]".match(reItems)).toBe(null);
    expect(".todo[0]@price".match(reItems)).not.toBe(null);
    expect(".todo[0]@price".match(reItems)).not.toBe(null);
    expect(".todo[0].body".match(reItems)).not.toBe(null);
    expect(".todo[0].link__label".match(reItems)).not.toBe(null);
    expect(".todo[0].link__label|en".match(reItems)).not.toBe(null);

    expect(".todo[0]@price".match(reItems)[1]).toBe('todo');//item name
    expect(".todo[0]@price".match(reItems)[2]).toBe('0');//item index
    expect(".todo[0]@price".match(reItems)[3]).toBe('@price');
    expect(".todo[0]@price".match(reItems)[4]).toBe('price');//attribute name
    expect(".todo[0]@price".match(reItems)[5]).toBe(undefined);//value name
    expect(".todo[0]@price".match(reItems)[6]).toBe(undefined);//value language

    expect(".todo[0].link__label".match(reItems)[1]).toBe('todo');
    expect(".todo[0].link__label".match(reItems)[2]).toBe('0');
    expect(".todo[0].link__label".match(reItems)[3]).toBe('.link__label');
    expect(".todo[0].link__label".match(reItems)[4]).toBe(undefined);
    expect(".todo[0].link__label".match(reItems)[5]).toBe('link__label');
    expect(".todo[0].link__label".match(reItems)[6]).toBe(undefined);

    expect(".todo[0].link__label|en".match(reItems)[1]).toBe('todo');
    expect(".todo[0].link__label|en".match(reItems)[2]).toBe('0');
    expect(".todo[0].link__label|en".match(reItems)[3]).toBe('.link__label|en');
    expect(".todo[0].link__label|en".match(reItems)[4]).toBe(undefined);
    expect(".todo[0].link__label|en".match(reItems)[5]).toBe('link__label');
    expect(".todo[0].link__label|en".match(reItems)[6]).toBe('en');
    expect(".todo[0].link__label|zh-hant".match(reItems)[6]).toBe('zh-hant');
    expect(".todo[0].link__label|".match(reItems)[5]).toBe('link__label');
    expect(".todo[0].link__label|".match(reItems)[6]).toBe(undefined);
  });

  test('regexp block', ()=>{
    const reBlock = /^#(\d)+([.@][\w+\[\].@|-]+)$/
    expect(":name".match(reBlock)).toBe(null);
    expect("@name|".match(reBlock)).toBe(null);
    expect("@todo[0].body".match(reBlock)).toBe(null);
    expect("@todo".match(reBlock)).toBe(null);
    expect("#0todo".match(reBlock)).toBe(null);
    expect("#0@todo".match(reBlock)).not.toBe(null);
    expect("#0.todo".match(reBlock)).not.toBe(null);
    expect("#1.name|zh-hant".match(reBlock)).not.toBe(null);

    expect("#0@_type".match(reBlock)[1]).toBe("0");
    expect("#0@todo".match(reBlock)[1]).toBe("0");
    expect("#0@todo".match(reBlock)[2]).toBe("@todo");
    expect("#0.todo".match(reBlock)[2]).toBe(".todo");
    expect("#1.name|zh-hant".match(reBlock)[1]).toBe("1");
    expect("#1.name|zh-hant".match(reBlock)[2]).toBe(".name|zh-hant");
  })

  test('inputs to original', ()=>{
    const input = {
      "@_type": "pages",
      "@city":"city",
      ".name":"foo",
      ".name|zh-hant":"髮",
      ".body":"bar",
      ".link__label":"click me",
      ".link__url":"https://www.example.com",
      ".todo[0]@price":"160",
      ".todo[0].body":"tar",
      ".todo[0].link__label":"details",
      ".todo[0].link__url":"https://www.example.com/details",
      ".todo[1]@price":"160",
      ".todo[1].body":"sha",
      "#0@_type":"paragraph",
      "#0@city":"block city",
    }

    let original = HelperPageText.blueprint('pages', blueprint);
    HelperPageText.update(original, "@_type", "news", "en");
    expect(original.attributes._type).toBe('news');

    HelperPageText.update(original, "@city", "Hong Kong", "en");
    expect(original.attributes.city).toBe('Hong Kong');

    HelperPageText.update(original, "@city", "香港", "zh-hant");
    expect(original.attributes.city).toBe('香港');

    HelperPageText.update(original, ".name", "foo", "en");
    expect(original.values.en.name).toBe('foo');

    HelperPageText.update(original, ".name|zh-hant", "髮", "en");
    expect(original.values.en.name).toBe('foo');
    expect(original.values["zh-hant"].name).toBe('髮');

    HelperPageText.update(original, ".link__label", "click me", "en");
    expect(original.values.en.link__label).toBe('click me');

    HelperPageText.update(original, ".todo[0]@price", "160");
    expect(original.items.todo[0].attributes.price).toBe("160");

    HelperPageText.update(original, ".todo[0].body", "tar");
    expect(original.items.todo[0].values.en.body).toBe("tar");

    HelperPageText.update(original, ".todo[0].body|zh-hant", "試");
    expect(original.items.todo[0].values['zh-hant'].body).toBe("試");

    HelperPageText.update(original, ".todo[1].body", "sha");
    expect(original.items.todo[1].values.en.body).toBe("sha");

    expect(JSON.stringify(original)).toBe(
      JSON.stringify({
        attributes:{
          _type: "news",
          city: "香港"
        },
        values:{
          en:{name: "foo", body: "", link__label : "click me", link__url : ""},
          "zh-hant":{name:"髮"}
        },
        items:{
          todo:[
            {
              attributes:{_weight: 0, price:"160"},
              values:{
                en:{body:"tar", link__label: "", link__url: ""},
                'zh-hant':{body:"試"}}
            },
            {
              attributes:{},
              values:{
                en:{body:"sha"},
              }
            }
          ]
        }
      })
    )


  })

  test('inputs to blocks', ()=>{
    const input = {
      "@_type": "pages",
      "@city":"city",
      ".name":"foo",
      ".name|zh-hant":"髮",
      ".body":"bar",
      ".link__label":"click me",
      ".link__url":"https://www.example.com",
      ".todo[0]@price":"160",
      ".todo[0].body":"tar",
      ".todo[0].link__label":"details",
      ".todo[0].link__url":"https://www.example.com/details",
      ".todo[1]@price":"160",
      ".todo[1].body":"sha",
      "#0@_type":"paragraph",
      "#0@city":"block city",
    }

    const print = HelperPageText.blueprint('pages', blueprint);
    HelperPageText.update(print, "#0@_type", "paragraph", 'en');
    expect(print.blocks[0].attributes._type).toBe('paragraph');

    HelperPageText.update(print, "#0@city", "block city", 'en');
    expect(print.blocks[0].attributes.city).toBe('block city');

    HelperPageText.update(print, "#1.name|zh-hant", "髮髮", 'en');
    expect(print.blocks[1].values['zh-hant'].name).toBe('髮髮');

    HelperPageText.update(print, "#1.name", "hello", 'en');
    expect(print.blocks[1].values.en.name).toBe('hello');

    expect(JSON.stringify(print)).toBe(
      JSON.stringify({
        attributes:{
          _type: "pages",
          city: ""
        },
        values:{
          en:{name: "", body: "", link__label : "", link__url : ""}
        },
        items:{
          todo:[
            {
              attributes:{ _weight: 0, price:""},
              values:{en:{body:"", link__label: "", link__url: ""}}
            }
          ]
        },
        blocks:[
          {
            attributes:{_type: "paragraph", city:"block city"},
            values: {},
            items: {}
          },
          {
            attributes:{},
            values: {
              'zh-hant':{
                name:"髮髮"
              },
              en:{
                name:"hello"
              },
            },
            items: {}
          }
        ]
      })
    )
  })

  test('merge originals', () =>{
    const originalPage = HelperPageText.blueprint('pages', blueprint);
    const originalPoster = HelperPageText.blueprint('poster', blueprint);
    HelperPageText.update(originalPage, '.name', 'Megahit');
    HelperPageText.update(originalPage, '.body', 'Lorem lipsum');
    HelperPageText.update(originalPoster, '@location', 'city_hall');
    HelperPageText.update(originalPoster, '.range[0]@price', '100');
    HelperPageText.update(originalPoster, '.range[1]@price', '200');
    HelperPageText.update(originalPoster, '.range[2]@price', '500');
    HelperPageText.update(originalPoster, '.range[0].name', 'entry class');

    const original = HelperPageText.mergeOriginals(originalPage, originalPoster);
    expect(JSON.stringify(original)).toBe(JSON.stringify({
      attributes:{
        _type: "poster",
        city: "",
        location:"city_hall"
      },
      values:{
        en:{name: "Megahit", body: "Lorem lipsum", link__label : "", link__url : "", slogan:""}
      },
      items:{
        todo:[
          {
            attributes:{ _weight: 0, price:""},
            values:{en:{body:"", link__label: "", link__url: ""}}
          }
        ],
        range:[
          {
            attributes:{_weight:0, price:"100"},
            values:{en:{name:"entry class"}}
          },
          {
            attributes:{price:"200"},
            values:{}
          },
          {
            attributes:{price:"500"},
            values:{}
          }
        ]
      }
    }))
  })

  test('original to print', ()=>{
    const original = {
      attributes:{
        _type: "pages",
        city: ""
      },
      values:{
        en:{name: "", body: "", link__label : "", link__url : ""}
      },
      items:{
        todo:[
          {
            attributes:{_weight:0, price:""},
            values:{en:{body:"", link__label: "", link__url: ""}}
          }
        ]
      },
      blocks:[
        {
          attributes:{_weight:0, _type: "paragraph", city:"block city"},
          values: {},
          items: {}
        },
        {
          attributes:{_weight: 1, _type: "text"},
          values: {
            'zh-hant':{
              name:"髮髮"
            },
            en:{
              name:"hello"
            },
          },
          items: {}
        }
      ]
    };

    const print = HelperPageText.originalToPrint(original, 'zh-hant', 'en');
    expect(JSON.stringify(print)).toBe(JSON.stringify({
      tokens:{
        _type:"pages",
        city: "",
        name: "",
        body: "",
        todo:[{ _weight: 0, price:"", body:"", link:{label:"",url:""}}],
        link:{label:"",url:""},
      },
      blocks:[
        {tokens: {
          _weight: 0,
          _type:"paragraph",
          city: "block city",
        }},
        {tokens: {
          _weight: 1,
          _type:"text",
          name: "髮髮"
        }}
      ],
      tags:{}
    }))
  })

  test('merge original example', () =>{
    const defaultOriginal = {
      "attributes": {
        "_type": "pages",
        "city": ""
      },
      "values": {
        "en": {
          "name": "",
          "body": "",
          "link__label": "",
          "link__url": ""
        }
      },
      "items": {
        "todo": [
          {
            "attributes": {
              "_weight": 0
            },
            "values": {
              "en": {
                "body": "",
                "link__label": "",
                "link__url": ""
              }
            }
          }
        ]
      },
      "blocks": []
    };

    const pageOriginal = {
      "attributes": {
        "_type": "pages",
        "city": "",
        "_weight": 0
      },
      "values": {
        "en": {
          "name": "whatsup",
          "body": "",
          "link__label": "",
          "link__url": ""
        },
        "zh-hant": {
          "name": "好"
        }
      },
      "items": {
        "todo": [
          {
            "attributes": {
              "_weight": 0
            },
            "values": {
              "en": {
                "body": "hello"
              }
            }
          }
        ]
      },
      "blocks": []
    }

    expect(JSON.stringify(HelperPageText.mergeOriginals(defaultOriginal, pageOriginal))).toBe(JSON.stringify({
      "attributes": {
        "_type": "pages",
        "city": "",
        "_weight": 0
      },
      "values": {
        "en": {
          "name": "whatsup",
          "body": "",
          "link__label": "",
          "link__url": ""
        },
        "zh-hant": {
          "name": "好"
        }
      },
      "items": {
        "todo": [
          {
            "attributes": {
              "_weight": 0
            },
            "values": {
              "en": {
                "body": "hello",
                "link__label": "",
                "link__url": ""
              }
            }
          }
        ]
      },
      "blocks": []
    }));
  })
});