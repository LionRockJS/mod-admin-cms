const def = {
  "sample": [
    "@date", "@weight",
    "name", "body", "teaser", "link",
    { "pictures": [ "@pictures", "caption"] },
    { "logos": [ "@logos" ] }
  ]
}


const sample = {
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