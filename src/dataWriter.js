var DataTypes = require('./dataTypes');

var typesTable = {};

typesTable[DataTypes.boolean] = function (value) {
    var buffer = new Buffer(1);
    buffer.writeInt8(value, 0);
    return buffer;
};

typesTable[DataTypes.int8] = function (value) {
    var buffer = new Buffer(1);
    buffer.writeInt8(value, 0);
    return buffer;
};

typesTable[DataTypes.uint8] = function (value) {
    var buffer = new Buffer(1);
    buffer.writeUInt8(value, 0);
    return buffer;
};

typesTable[DataTypes.int16] = function (value) {
    var buffer = new Buffer(2);
    buffer.writeInt16BE(value, 0);
    return buffer;
};

typesTable[DataTypes.uint16] = function (value) {
    var buffer = new Buffer(2);
    buffer.writeUInt16BE(value, 0);
    return buffer;
};

typesTable[DataTypes.int32] = function (value) {
    var buffer = new Buffer(4);
    buffer.writeInt32BE(value, 0);
    return buffer;
};

typesTable[DataTypes.uint32] = function (value) {
    var buffer = new Buffer(4);
    buffer.writeUInt32BE(value, 0);
    return buffer;
};

typesTable[DataTypes.float] = function (value) {
    var buffer = new Buffer(4);
    buffer.writeFloatBE(value, 0);
    return buffer;
};

typesTable[DataTypes.double] = function (value) {
    var buffer = new Buffer(8);
    buffer.writeDoubleBE(value, 0);
    return buffer;
};

typesTable[DataTypes.string] = function (value) {
    /*var length;
    length = buffer.writeUInt16BE(pointer.offset);
    pointer.offset += 2;
    buffer.toString('utf8', pointer.offset, pointer.offset + length);
    pointer.offset += length;*/
};

typesTable[DataTypes.shortBuffer] = function (value) {
   /*var length;
    length = buffer.writeUInt16BE(pointer.offset);
    pointer.offset += 2;
    buffer.slice(pointer.offset, pointer.offset + length);
    pointer.offset += length;*/
};

typesTable[DataTypes.buffer] = function (value) {
   /* var length;
    length = buffer.writeUInt32BE(pointer.offset);
    pointer.offset += 4;
    buffer.slice(pointer.offset, pointer.offset + length);
    pointer.offset += length;*/
};

typesTable[DataTypes.struct] = function (pointer, buffer, scheme) {
    //return structureWriter(pointer, buffer, scheme);
};

typesTable[DataTypes.list] = function (pointer, buffer, scheme) {
   /* var length = buffer.writeUInt16BE(pointer.offset);
    pointer.offset += 2;

    [];
    while (length--) {
        res.push(structureWriter(pointer, buffer, scheme));
    }*/
};

var structureWriter = function (pointer, object, scheme) {
    if (arguments.length === 2) {
        scheme = object;
        object = pointer;
        pointer = {
            offset: 0
        };
    }

    var res = [];
    if(typeof scheme  === 'number') {
        res.push(typesTable[scheme](object));
    } else {
        for (var el in scheme) {
            var s = scheme[el];
            if (typeof s === 'number') {
                res.push(typesTable[s](object[el]));
            } else {
                res.push(typesTable[s.type](object[el], s.scheme));
            }
        }
    }

    return new Buffer.concat(res);
};

module.exports = structureWriter;