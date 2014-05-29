var Benchmark = require('benchmark');
var suite = new Benchmark.Suite;

DataTypes = require("../src/index").DataTypes;
DataReader = require("../src/index").DataReader;
DataWriter = require("../src/index").DataWriter;



var suites = {
    'int32': {
        object: 0x0F00FF00,
        scheme: DataTypes.int32
    },
    'string': {
        object: 'Hello I String',
        scheme: DataTypes.string
    },
    'nested': {
        object: { nested: { nested2: { nested3: { nested4: { nested5: 42 } } } } },
        scheme: { nested: { nested2: { nested3: { nested4: { nested5: DataTypes.uint8 } } } } }
    },
    'list of list': {
        object: [
            [90,10,101],
            [20,30,400],
            [100,110,1]
        ],
        scheme: [[DataTypes.int16]]
    }
};

for(s in suites) {
    var object = suites[s].object;
    var scheme = suites[s].scheme;

    (function(s, object, scheme) {
        var buf = null;
        var obj = null;
        suite.add(s + '#writing to buffer', function () {
            buf = DataWriter(object, scheme);
        })
        .add(s + '#reading from buffer', function () {
            obj = DataReader(buf, scheme);
        });
    })(s, object, scheme);
}


suite.on('cycle', function(event) {
    console.log(String(event.target));
}).run();