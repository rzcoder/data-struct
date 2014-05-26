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
    var buffer = new Buffer(value);
    var length = buffer.length;
    if (length > 0xFFFF) {
        throw Error('String too long');
    }

    var res = new Buffer(2 + length);
    res.writeUInt16BE(length, 0);
    buffer.copy(res, 2);

    return res;
};

typesTable[DataTypes.shortBuffer] = function (value) {
    var length = value.length;
    if (length > 0xFFFF) {
        throw Error('Buffer too long');
    }

    var res = new Buffer(2 + length);
    res.writeUInt16BE(length, 0);
    value.copy(res, 2);

    return res;
};

typesTable[DataTypes.buffer] = function (value) {
    var length = value.length;

    if (length > 0xFFFFFFFF) {
        throw Error('Buffer too long');
    }

    var res = new Buffer(4 + length);
    res.writeUInt32BE(length, 0);
    value.copy(res, 4);

    return res;
};

typesTable[DataTypes.struct] = function (value, scheme) {
    return structureWriter(value, scheme);
};

typesTable[DataTypes.list] = function (value, scheme) {
    if (!Array.isArray(value)) {
        throw Error('Value is not array.');
    }

    var res = [];
    var lenBuf = new Buffer(2);
    var length = value.length;
    lenBuf.writeUInt16BE(length,0);
    res.push(lenBuf);

    for(var i = 0; i < length; i++) {
        res.push(structureWriter(value[i], scheme));
    }

    return Buffer.concat(res);
};

var structureWriter = function (object, scheme) {
    var res = [];
    if(typeof scheme  === 'number') {
        res.push(typesTable[scheme](object));
    } else {
        if(Array.isArray(scheme)) {
            console.log('bingo')
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
    }

    return new Buffer.concat(res);
};

module.exports = structureWriter;