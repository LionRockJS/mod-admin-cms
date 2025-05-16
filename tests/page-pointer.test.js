import HelperPageEdit from "../classes/helper/PageEdit.mjs";

const blueprint = {
  contact : [
    "@source",
    "@gender:person/gender",
    "name:person/name",
    {knows: ["@type", "*contact", "*contact.name:person/name"]},
  ],
};

describe('page helper test', () => {
  test('get blueprint original', async()=>{
    expect(JSON.stringify(HelperPageEdit.blueprint('contact', blueprint)))
      .toBe(JSON.stringify({
        attributes:{
          _type: "contact",
          source: "",
          gender: "",
        },
        pointers:{
        },
        values:{
          en:{
            name: ""
          }
        },
        items:{
          knows:[
            {
              attributes:{_weight: 0, type:""},
              pointers:{
                contact:"",
                "contact.name":""
              },
              values:{
                  en:{}
              }
            }
          ]
        }
      }));
  });

  test('get blueprint props', async()=>{
    const blueprintProps = HelperPageEdit.get_blueprint_props(blueprint['contact']);

    expect(JSON.stringify(blueprintProps))
    .toBe(JSON.stringify({
      attributes:[
        {name: "source", type: "text"},
        {name: "gender", type: "person/gender"}
      ],
      pointers:[],
      fields:[
        {name: "name", type: "person/name"}
      ],
      items:[
        {
            name: "knows",
            attributes:[
                {name: "type", type: "text"}
            ],
            pointers:[
                {name: "contact", type: "page/basic"},
                {name: "contact.name", type: "person/name"}
            ],
            fields:[]
        }
      ]
    }));
  })
});