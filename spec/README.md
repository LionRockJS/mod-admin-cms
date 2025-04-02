LionRockCMS use form input name to directly edit the data in the database

The data is stored as json in the database. 

The json object is named as 'original', is structured as follows:

```
{
  "attributes" :{
  },
  "values":{
    "en":{
    },
    "zh-hant":{
    },
    "zh-hans":{
    }
  },
  "items":{
  }
}
```

with the definition of the attributes, values and items as follows:
this definition format called "blueprint":
```
{
    event:  [
      "@timezone", "@virtual_event_link", "name", "location",
      {
        session:["@type", "@capacity", "name", "subject"]
      }
    ],
}
```
the name of attribute prefix with "@". Attribute is not translate with multiple language.
the name of value is without prefix, Value can translate with multiple language.
the object is the name of the item, the item is a list of attributes and values.

with above blueprint, the json object will be structured as follows:
```
{
    "attributes": {
        "timezone": "+0800",
        "virtual_event_link":"https://www.example.com"
    },
    "values": {
        "en": {
            "name": "Hello World",
            "location__name": "ACME Corporation",
            "location__address": "47 W 13th Street,",
            "location__city": "New York,",
            "location__state": "NY",
            "location__zip": "10011",
            "location__country": "USA"
        },
        "zh-hant": {
            "name": "你好，世界",
            "location__name": "ACME 公司",
            "location__address": "13 街 47 號",
            "location__city": "紐約",
            "location__state": "紐約州",
        },
        "zh-hans": {
            "name": "你好，世界",
            "location__name": "ACME 公司",
            "location__address": "13 街 47 号",
            "location__city": "纽约",
            "location__state": "纽约州",
        }
    },
    "items": {
        "session": [
            {
                "attributes": {
                    "_weight": "0"
                    "type": "workshop",
                    "capacity": "100"
                },
                "values": {
                    "en": {
                        "name": "Workshop one",
                        "subject": "How to build a website"
                    },
                    "zh-hant": {
                        "name": "工作坊 壹",
                        "subject": "如何建立網站"
                    },
                    "zh-hans": {
                        "name": "工作坊 一",
                        "subject": "如何建立网站"
                    }
                }
            }
        ]
    }
}
```

The HTML form to change the data in the database is as follows:

```
<input type="hidden" name="language" value="en">
<input type="text" name="@timezone" value="+0800">
<input type="text" name="@virtual_event_link" value="https://www.example.com">
<input type="text" name=".name" value="Hello World">
<input type="text" name=".location__name" value="ACME Corporation">
<input type="text" name=".location__address" value="47 W 13th Street,">
<input type="text" name=".location__city" value="New York,">
<input type="text" name=".location__state" value="NY">
<input type="text" name=".location__zip" value="10011">
<input type="text" name=".location__country" value="USA">
<input type="text" name=".session[0]@type" value="workshop">
<input type="text" name=".session[0]@capacity" value="100">
<input type="text" name=".session[0].name" value="Workshop one">
<input type="text" name=".session[0].subject" value="How to build a website">
```