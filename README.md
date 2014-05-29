# Data structure

Convert between JS object and Node.js buffer with rigidly predetermined scheme.

## Installing

```shell
    npm install data-struct
```


## Example & usage

```javascript

var DataTypes = require("data-struct").DataTypes;
var DataReader = require("data-struct").DataReader;
var DataWriter = require("data-struct").DataWriter;

var hero = {
    id: 9,
    name: 'CirnoBaka',
    hp: 146,
    skills: [
        {
            id: 34,
            description: 'freezing frogs'
        },
        {
            id: 16,
            description: 'perfect math'
        }
    ],
    playable: false,
    experience: 99999999,
    position: {
        x: 2,
        y: 3
    }
};

var heroScheme = {
    id: DataTypes.uint32,
    name: DataTypes.string,
    hp: DataTypes.int16,
    skills: [{
        id: DataTypes.uint16,
        description: DataTypes.string
    }],
    playable: DataTypes.boolean,
    experience: DataTypes.uint32,
    position: {
        x: DataTypes.uint16,
        y: DataTypes.uint16
    }
};

var heroBuf = DataWriter(hero, heroScheme);
var heroClone = DataReader(heroBuf, heroScheme);


//nested arrays
var map = [
    [0,1,0,0,1,1,1,1],
    [1,1,0,0,0,1,1,1],
    [1,1,0,0,0,0,1,1],
    [1,1,1,1,0,0,1,1],
    [0,1,1,0,0,0,1,1],
    [0,0,0,0,0,1,1,1],
    [0,0,0,0,1,1,1,1]
];

var mapScheme = [[DataTypes.uint8]];

var mapBuf = DataWriter(map, mapScheme);
var mapClone = DataReader(mapBuf, mapScheme);
```


## Data types

  * **boolean** - 1 byte
  * **int8** - 1 byte
  * **uint8** - 1 byte
  * **int16** - 2 bytes
  * **uint16** - 2 bytes
  * **int32** - 4 bytes
  * **uint32** - 4 bytes
  * **float** - 4 bytes
  * **double** - 8 bytes
  * **string** - 2 bytes header + string bytes length (max length: 65535 bytes, **not string length!**)
  * **shortBuffer**  - 2 bytes header  + buffer length (max length: 65535 bytes)
  * **buffer**  - 4 bytes header + buffer length (max length 4294967295 bytes)
