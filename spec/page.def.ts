type PageName = `a${string}`| `b${string}`| `c${string}`| `d${string}`| `e${string}`| `f${string}`| `g${string}`| `h${string}`| `i${string}`| `j${string}`| `k${string}`| `l${string}`| `m${string}`| `n${string}`| `o${string}`| `p${string}`| `q${string}`| `r${string}`| `s${string}`| `t${string}`| `u${string}`| `v${string}`| `w${string}`| `x${string}`| `y${string}`| `z${string}`;
type PageValueName = PageName | `.${string}`;
type PageAttributeName = `@${string}`;
type PageFieldName = PageAttributeName | PageValueName;
type PageItemName = {[key:PageValueName]: PageFieldName[]}
type PagePropertyName = PageFieldName | PageItemName
type PageDefinition = PagePropertyName[]

const sample:PageDefinition = [
    "@date",
    "@weight",
    "name",
    "body",
    "teaser",
    "link",
    { "pictures": [ "@pictures", "caption"] },
    { "logos": [ "@logos" ] }
]

const value:PageValueName = "value"
//const notValue:PageValueName = "@value"; // Error
const item:PageItemName = { "logos": [ "@logos" ] }
//const errorItem:PageItemName = { "@logos": [ "@logos", "caption" ] } // Error


const blueprints:{[key:PageName]: PageDefinition} = {
    "sample": [
        "@date", "@weight",
        "name", "body", "teaser", "link",
        { "pictures": [ "@pictures", "caption"] },
        { "logos": [ "@logos" ] }
    ],
    "sample2": [
        "@price",
        "name", "body"
    ]
}

type Relationship = [PageDefinition, PageDefinition];
const relationship:Relationship[] = [
    [blueprints.sample, blueprints.sample2],
    [blueprints.sample, blueprints.sample2],
]

const sample_original = {
    "attributes": {
        "date": "26-09-2021",
        "weight": 1
    },
    "values": {
        "en": {
            "name": "foo",
            "body": "bar",
            "teaser": "kaa",
            "link_label": "click here",
            "link_url": "https://www.example.com"
        },
        "zh-hant": {
            "name": "愛"
        }
    },
    "items": {
        "pictures": [
            {
                "attributes": {
                    "picture": "/media/images/example.png"
                },
                "values": {
                    "en": {
                        "caption": "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
                    },
                }
            },
            {
                "attributes": {
                    "picture": "/media/images/example_2.png"
                },
                "values": {
                    "en": {
                        "caption": "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
                    }
                }
            }
        ],
        "logos": [
            {
                "attributes": {
                    "logo": "/media/images/foo.png"
                }
            },
            {
                "attributes": {
                    "logo": "/media/images/foo_2.png"
                }
            }
        ]
    }
}