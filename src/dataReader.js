var DataTypes = require('./dataTypes');

var typesTable = {};

typesTable[DataTypes.boolean] = function (pointer, buffer) {
    var res = buffer.readInt8(pointer.offset);
    pointer.offset += 1;
    return !!res;
};

typesTable[DataTypes.int8] = function (pointer, buffer) {
    var res = buffer.readInt8(pointer.offset);
    pointer.offset += 1;
    return res;
};

typesTable[DataTypes.uint8] = function (pointer, buffer) {
    var res = buffer.readUInt8(pointer.offset);
    pointer.offset += 1;
    return res;
};

typesTable[DataTypes.int16] = function (pointer, buffer) {
    var res = buffer.readInt16BE(pointer.offset);
    pointer.offset += 2;
    return res;
};

typesTable[DataTypes.uint16] = function (pointer, buffer) {
    var res = buffer.readUInt16BE(pointer.offset);
    pointer.offset += 2;
    return res;
};

typesTable[DataTypes.int32] = function (pointer, buffer) {
    var res = buffer.readInt32BE(pointer.offset);
    pointer.offset += 4;
    return res;
};

typesTable[DataTypes.uint32] = function (pointer, buffer) {
    var res = buffer.readUInt32BE(pointer.offset);
    pointer.offset += 4;
    return res;
};

typesTable[DataTypes.float] = function (pointer, buffer) {
    var res = buffer.readFloatBE(pointer.offset);
    pointer.offset += 4;
    return res;
};

typesTable[DataTypes.double] = function (pointer, buffer) {
    var res = buffer.readDoubleBE(pointer.offset);
    pointer.offset += 8;
    return res;
};

typesTable[DataTypes.string] = function (pointer, buffer) {
    var length;
    length = buffer.readUInt16BE(pointer.offset);
    pointer.offset += 2;
    var res = buffer.toString('utf8', pointer.offset, pointer.offset + length);
    pointer.offset += length;
    return res;
};

typesTable[DataTypes.shortBuffer] = function (pointer, buffer) {
    var length;
    length = buffer.readUInt16BE(pointer.offset);
    pointer.offset += 2;
    var res = buffer.slice(pointer.offset, pointer.offset + length);
    pointer.offset += length;
    return res;
};

typesTable[DataTypes.buffer] = function (pointer, buffer) {
    var length;
    length = buffer.readUInt32BE(pointer.offset);
    pointer.offset += 4;
    var res = buffer.slice(pointer.offset, pointer.offset + length);
    pointer.offset += length;
    return res;
};

function list (pointer, buffer, scheme) {
    var length = buffer.readUInt16BE(pointer.offset);
    pointer.offset += 2;

    var res = [];
    while (length--) {
        res.push(structureReader(pointer, buffer, scheme));
    }
    return res;
}

var structureReader = function (pointer, buffer, scheme) {
    var res = {};

    if (arguments.length === 2) {
        scheme = buffer;
        buffer = pointer;
        pointer = {
            offset: 0
        };
    }

    if(typeof scheme  === 'number') {
        res = typesTable[scheme](pointer, buffer);
    } else if (Array.isArray(scheme)) {
        res = list(pointer, buffer, scheme[0]);
    } else {
        for (var el in scheme) {
            var s = scheme[el];
            if (typeof s === 'number') {
                res[el] = typesTable[s](pointer, buffer);
            }  else if (Array.isArray(s)) {
                res[el] = list(pointer, buffer, s[0]);
            } else {
                res[el] = structureReader(pointer, buffer, s);
            }
        }
    }

    return res;
};

module.exports = structureReader;