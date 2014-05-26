/**
 * TODO: tests for compatibility with other rsa libraries
 */

var assert = require("chai").assert;
DataTypes = require("../src/index").DataTypes;
DataReader = require("../src/index").DataReader;
DataWriter = require("../src/index").DataWriter;

suite("DataStruct", function(){

    var dataBundle = {
        'basic types': {
            object: 42,
            scheme: DataTypes.uint16,
            buffer: new Buffer([0x00, 0x2a])
        },

        'flat structure (basic types)': {
            object: {
                boolean: true,
                int8: -126,
                uint8: 255,
                int16: -1000,
                uint16: 65535,
                int32: -100000,
                uint32: 100000,
                float: 1230000,
                double: -123.456
            },

            scheme: {
                boolean: DataTypes.boolean,
                int8: DataTypes.int8,
                uint8: DataTypes.uint8,
                int16: DataTypes.int16,
                uint16: DataTypes.uint16,
                int32: DataTypes.int32,
                uint32: DataTypes.uint32,
                float: DataTypes.float,
                double: DataTypes.double
            },

            buffer: new Buffer([
                0x01, // boolean
                0x82, // int8
                0xff, // uint8
                0xfc, 0x18, // int16
                0xff, 0xff, // uint16
                0xff, 0xfe, 0x79, 0x60, // int32
                0x00, 0x01, 0x86, 0xa0, // uint32
                0x49, 0x96, 0x25, 0x80, // float
                0xc0, 0x5e, 0xdd, 0x2f, 0x1a, 0x9f, 0xbe, 0x77, // double
            ])
        },

        'flat structure (composite types)': {
            object: {
                string: 'Some text + юникод',
                shortBuffer: new Buffer([1,2,3]),
                buffer: new Buffer([0xaa,0xbb,0xcc])
            },

            scheme: {
                string: DataTypes.string,
                shortBuffer: DataTypes.shortBuffer,
                buffer: DataTypes.buffer
            },

            buffer: new Buffer([
                0x00, 0x18, // string length (uint16 BE)
                0x53, 0x6f, 0x6d, 0x65, 0x20, 0x74, 0x65, 0x78, 0x74, 0x20, 0x2b, 0x20, 0xd1, 0x8e, 0xd0, 0xbd, 0xd0, 0xb8, 0xd0, 0xba, 0xd0, 0xbe, 0xd0, 0xb4, // string
                0x00, 0x03, // short buffer length (uint16 BE)
                0x01, 0x02, 0x03, // shortBuffer
                0x00, 0x00, 0x00, 0x03, // buffer length (uint16 BE)
                0xaa, 0xbb, 0xcc // buffer
            ])
        },

        'list of strings': {
            object: {
                values: [
                    'string1',
                    'string20',
                    'string300'
                ]
            },

            scheme: {
                values: {
                    type: DataTypes.list,
                    scheme: DataTypes.string
                }
            },

            buffer: new Buffer([
                0x00, 0x03, // list length (uint16 BE)
                0x00, 0x07, // string length (uint16 BE)
                0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x31, // string1
                0x00, 0x08, // string length (uint16 BE)
                0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x32, 0x30, // string20
                0x00, 0x09, // string length (uint16 BE)
                0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x33, 0x30, 0x30 // string300
            ])
        },

        'list of objects': {
            object: {
                friends: [
                    {
                        name: 'Alice',
                        age: 21
                    },
                    {
                        name: 'Bob',
                        age: 17
                    }
                ],
                numbers: [
                    0x10, 0x26, 0x61, 0xff
                ]
            },

            scheme: {
                friends: {
                    type: DataTypes.list,
                    scheme: {
                        name: DataTypes.string,
                        age: DataTypes.uint32
                    }
                },
                numbers: {
                    type: DataTypes.list,
                    scheme: DataTypes.uint8
                }
            },

            buffer: new Buffer([
                0x00, 0x02, // friends list length (uint16 BE)
                0x00, 0x05, // string length (uint16 BE)
                0x41, 0x6c, 0x69, 0x63, 0x65, // string
                0x00, 0x00, 0x00, 0x15, //uint32
                0x00, 0x03, // string length (uint16 BE)
                0x42, 0x6f, 0x62, // string
                0x00, 0x00, 0x00, 0x11, //uint32
                0x00, 0x04, // numbers list length (uint16 BE)
                0x10, 0x26, 0x61, 0xff // numbers
            ])
        }

    };

    suite("Buffer to Object convert", function(){
        for(var suite in dataBundle) {
            var data = dataBundle[suite];
            (function(suite, data) {
                test("should return buffer for '" + suite + "' suite", function () {
                    var res = DataReader(data.buffer, data.scheme);
                    assert.deepEqual(res, data.object);
                });
            })(suite, data);
        }
    });

    suite("Object to Buffer convert", function(){
        for(var suite in dataBundle) {
            var data = dataBundle[suite];
            (function(suite, data) {
                test("should return buffer for '" + suite + "' suite", function () {
                    var res = DataWriter(data.object, data.scheme);
                    assert.deepEqual(res, data.buffer);
                });
            })(suite, data);
        }
    });
});