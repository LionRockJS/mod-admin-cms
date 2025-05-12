import HelperPageText from "../classes/helper/PageText.mjs";
import HelperPageEdit from "../classes/helper/PageEdit.mjs";

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
    expect(JSON.stringify(HelperPageEdit.blueprint('pages', blueprint)))
      .toBe(JSON.stringify({
        attributes:{
          _type: "pages",
          city: ""
        },
        pointers:{
        },
        values:{
          en:{name: "", body: "", link__label : "", link__url : ""}
        },
        items:{
          todo:[
            {
              attributes:{_weight: 0, price:""},
              pointers:{},
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

  test('post to original', ()=>{
    const input = {
      "@_type": "pages",
      "@city":"city",
      "*parent":"111222",
      ".name":"foo",
      ".name|zh-hant":"髮",
      ".name|zh-hans":"",
      ".body":"bar",
      ".link__label":"click me",
      ".link__url":"https://www.example.com",
      ".todo[0]@price":"160",
      ".todo[0]*remote":"123456",
      ".todo[0].body":"tar",
      ".todo[0].link__label":"details",
      ".todo[0].link__url":"https://www.example.com/details",
      ".todo[1]@price":"160",
      ".todo[1].body":"sha",
      "#0@_type":"paragraph",
      "#0@city":"block city",
    }

    let original = HelperPageEdit.postToOriginal(input, "en");
    expect(JSON.stringify(original)).toBe(
        JSON.stringify({
          attributes:{
            _type: "pages",
            city: "city"
          },
          pointers:{
            parent:"111222"
          },
          values:{
            en:{name: "foo", body: "bar", link__label : "click me", link__url : "https://www.example.com"},
            "zh-hant":{name:"髮"},
            "zh-hans":{name:""}
          },
          items:{
            todo:[
              {
                attributes:{price:"160"},
                pointers:{
                    remote:"123456"
                },
                values:{
                  en:{body:"tar", link__label: "details", link__url: "https://www.example.com/details"},
                }
              },
              {
                attributes:{price:"160"},
                pointers:{},
                values:{
                  en:{body:"sha"},
                }
              }
            ]
          },
          blocks:[
            {
              attributes:{
                _type: "paragraph",
                city:"block city",
              },
              pointers:{},
              values:{
                en:{}
              },
              items:{}
            }
          ]
        })
    )

  });

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

    const print = HelperPageText.mergeOriginals(
      HelperPageEdit.blueprint('pages', blueprint),
      HelperPageEdit.postToOriginal(input, "en")
    );

    expect(JSON.stringify(print)).toBe(
      JSON.stringify({
        attributes:{
          _type: "pages",
          city: "city"
        },
        pointers:{},
        values:{
          en:{name: "foo", body: "bar", link__label : "click me", link__url : "https://www.example.com"},
          "zh-hant":{name:"髮"},
        },
        items:{
          todo:[
            {
              attributes:{ _weight: 0, price:"160"},
              pointers:{},
              values:{en:{body:"tar", link__label: "details", link__url: "https://www.example.com/details"}}
            },
            {
              attributes:{ price:"160"},
              pointers:{},
              values:{en:{body:"sha"}}
            }
          ]
        },
        blocks:[
          {
            attributes:{_type: "paragraph", city:"block city"},
            pointers:{},
            values: {
              en:{}
            },
            items: {}
          }
        ]
      })
    )
  })

  test('inputs to blocks for existing original', ()=>{
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

    const print = HelperPageText.mergeOriginals(
        {
          "attributes": {
            "_type": "pages",
            "city": ""
          },
          "pointers": {},
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
                  "_weight": 0,
                  "price": ""
                },
                "pointers": {},
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
          blocks:[
            {
              attributes:{_type: "paragraph", city:"block city"},
              pointers:{},
              values: {
                en:{}
              },
              items: {}
            },
            {
              attributes:{_type: "foo", value:"300"},
              pointers:{},
              values: {
                en:{}
              },
              items: {}
            }
          ]
        }
        ,
        HelperPageEdit.postToOriginal(input, "en")
    );

    expect(JSON.stringify(print)).toBe(
        JSON.stringify({
          attributes:{
            _type: "pages",
            city: "city"
          },
          pointers:{},
          values:{
            en:{name: "foo", body: "bar", link__label : "click me", link__url : "https://www.example.com"},
            "zh-hant":{name:"髮"},
          },
          items:{
            todo:[
              {
                attributes:{ _weight: 0, price:"160"},
                pointers:{},
                values:{en:{body:"tar", link__label: "details", link__url: "https://www.example.com/details"}}
              },
              {
                attributes:{ price:"160"},
                pointers:{},
                values:{en:{body:"sha"}}
              }
            ]
          },
          blocks:[
            {
              attributes:{_type: "paragraph", city:"block city"},
              pointers:{},
              values: {
                en:{}
              },
              items: {}
            },
            {
              attributes:{_type: "foo", value:"300"},
              pointers:{},
              values: {
                en:{}
              },
              items: {}
            }
          ]
        })
    )
  })

  test('merge originals', () =>{
    const post1 = {
      ".name": "Megahit",
      ".body": "Lorem lipsum",
    }

    const post2 = {
      "@location": "city_hall",
      ".range[0]@price": "100",
      ".range[1]@price": "200",
      ".range[2]@price": "500",
      ".range[0].name": "entry class",
    }


    const originalPage = HelperPageText.mergeOriginals(
        HelperPageEdit.blueprint('pages', blueprint),
        HelperPageEdit.postToOriginal(post1, "en")
    );

    const originalPoster = HelperPageText.mergeOriginals(
        HelperPageEdit.blueprint('poster', blueprint),
        HelperPageEdit.postToOriginal(post2, "en")
    )


    const original = HelperPageText.mergeOriginals(originalPage, originalPoster);

    expect(JSON.stringify(original)).toBe(JSON.stringify({
      attributes:{
        _type: "poster",
        city: "",
        location:"city_hall"
      },
      pointers:{},
      values:{
        en:{name: "Megahit", body: "Lorem lipsum", link__label : "", link__url : "", slogan:""}
      },
      items:{
        todo:[
          {
            attributes:{ _weight: 0, price:""},
            pointers:{},
            values:{en:{body:"", link__label: "", link__url: ""}}
          }
        ],
        range:[
          {
            attributes:{_weight:0, price:"100"},
            pointers:{},
            values:{en:{name:"entry class"}}
          },
          {
            attributes:{price:"200"},
            pointers:{},
            values:{}
          },
          {
            attributes:{price:"500"},
            pointers:{},
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
      pointers:{},
      values:{
        en:{name: "", body: "", link__label : "", link__url : ""}
      },
      items:{
        todo:[
          {
            attributes:{_weight:0, price:""},
            pointers:{},
            values:{en:{body:"", link__label: "", link__url: ""}}
          }
        ]
      },
      blocks:[
        {
          attributes:{_weight:0, _type: "paragraph", city:"block city"},
          pointers:{},
          values: {},
          items: {}
        },
        {
          attributes:{_weight: 1, _type: "text"},
          pointers:{},
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
        link__label: "",
        link__url: "",
        todo:[{ _weight: 0, price:"", body:"", link__label: "", link__url: "", link:{label:"",url:""}}],
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
      "pointers": {},
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
            "pointers": {},
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
      "pointers": {},
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
            "pointers": {},
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
      "pointers": {},
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
            "pointers": {},
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