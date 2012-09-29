(function(){
  var M = Math,
  pow = M.pow,
  und = 'undefined',
  Buffer;

  function mix(dst, src, safe){
    for(var i in src){
      if((!(i in dst) || !safe)){
        dst[i] = src[i];
      }
    }
    return dst;
  }

  function ast(val, msg){
    if(!val){
      throw new Error(msg);
    }
  }

  /* Slice Assertion Helper */
  function slice_ast(self, start, end){
    ast(start >= 0 && start < end && end <= self.length, 'oob');
  }

  /* Read Assertion Helper */
  function read_ast(self, offset, noAssert, bytes){
    if (!noAssert) {
      ast(offset !== undefined && offset !== null, 'missing offset');
      ast(offset >= 0, 'trying to read at negative offset');
      ast(offset + bytes <= self.length, 'Trying to read beyond buffer length');
    }
  }

  /* Write Assertion Helper */
  function write_ast(self, value, offset, noAssert, bytes, max, min, fract){
    if (!noAssert) {
      min = min || 0x0;
      ast(value !== undefined && value !== null, 'missing value');
      ast(offset >= 0, 'trying to write at negative offset');
      ast(offset + bytes <= self.length, 'trying to write beyond buffer length');
      /* value */
      ast(typeof value == 'number', 'cannot write a non-number as a number');
      ast(value >= min, min == 0 ? 'specified a negative value for writing an unsigned value'
          : 'value smaller than minimum allowed value');
      ast(value <= max, 'value is larger than maximum' + min == 0 ? 'value for type' : 'allowed value');
      ast(fract || M.floor(value) === value, 'value has a fractional component');
    }
  }

  /* Cooking Assertion with specified arguments */
  function cook_ast(bytes, max, min, fract){
    return max ? function(self, value, offset, noAssert){ /* write_ast */
      write_ast(self, value, offset, noAssert, bytes, max, min, fract);
    } : function(self, offset, noAssert){ /* read_ast */
      read_ast(self, offset, noAssert, bytes);
    };
  }

  var /* Read Asserts */
  read8_ast = cook_ast(1),
  read16_ast = cook_ast(2),
  read32_ast = cook_ast(4),
  read64_ast = cook_ast(8),
  /* Write Asserts */
  write8u_ast = cook_ast(1, 0xff),
  write16u_ast = cook_ast(2, 0xffff),
  write32u_ast = cook_ast(4, 0xffffffff),
  write8s_ast = cook_ast(1, 0x7f, -0x80),
  write16s_ast = cook_ast(2, 0x7fff, -0x8000),
  write32s_ast = cook_ast(4, 0x7fffffff, -0x80000000),
  write32_ast = cook_ast(4, 3.4028234663852886e+38, -3.4028234663852886e+38, true),
  write64_ast = cook_ast(8, 1.7976931348623157E+308, -1.7976931348623157E+308, true);

  if(typeof ArrayBuffer != und &&
     typeof DataView != und &&
     {}.__proto__){

    Buffer = function(data, encoding){
      if(!(this instanceof Buffer)){
        return new Buffer(data, encoding);
      }
      var buf = new ArrayBuffer(data);
      return wrap(buf, 0, buf.byteLength);
    };

    Buffer.hasDataView = true;

    function wrap(buf, start, end){
      // Wrong but ideologically more correct:
      // DataView.call(this, buf)
      var self = new DataView(buf, start, end - start);
      self.__proto__ = Buffer.prototype;
      self.length = self.byteLength;
      return self;
    }

    function DataViewProxy(){}
    DataViewProxy.prototype = DataView.prototype;

    Buffer.prototype = mix(new DataViewProxy(), {
      slice: function(start, end){
        start = start || 0;
        end = end || this.length;
        slice_ast(this, start, end);
        return wrap(this.buffer, start, end);
      },
      /* readUInts */
      readUInt8: function(offset, noAssert){
        read8_ast(this, offset, noAssert);
        return this.getUint8(offset);
      },
      readUInt16LE: function(offset, noAssert){
        read16_ast(this, offset, noAssert);
        return this.getUint16(offset, true);
      },
      readUInt16BE: function(offset, noAssert){
        read16_ast(this, offset, noAssert);
        return this.getUint16(offset, false);
      },
      readUInt32LE: function(offset, noAssert){
        read32_ast(this, offset, noAssert);
        return this.getUint32(offset, true);
      },
      readUInt32BE: function(offset, noAssert){
        read32_ast(this, offset, noAssert);
        return this.getUint32(offset, false);
      },
      /* readInts */
      readInt8: function(offset, noAssert){
        read8_ast(this, offset, noAssert);
        return this.getInt8(offset);
      },
      readInt16LE: function(offset, noAssert){
        read16_ast(this, offset, noAssert);
        return this.getInt16(offset, true);
      },
      readInt16BE: function(offset, noAssert){
        read16_ast(this, offset, noAssert);
        return this.getInt16(offset, false);
      },
      readInt32LE: function(offset, noAssert){
        read32_ast(this, offset, noAssert);
        return this.getInt32(offset, true);
      },
      readInt32BE: function(offset, noAssert){
        read32_ast(this, offset, noAssert);
        return this.getInt32(offset, false);
      },
      /* readFloats */
      readFloatLE: function(offset, noAssert){
        read32_ast(this, offset, noAssert);
        return this.getFloat32(offset, true);
      },
      readFloatBE: function(offset, noAssert){
        read32_ast(this, offset, noAssert);
        return this.getFloat32(offset, false);
      },
      readDoubleLE: function(offset, noAssert){
        read64_ast(this, offset, noAssert);
        return this.getFloat64(offset, true);
      },
      readDoubleBE: function(offset, noAssert){
        read64_ast(this, offset, noAssert);
        return this.getFloat64(offset, false);
      },
      /* writeUInts */
      writeUInt8: function(value, offset, noAssert){
        write8u_ast(this, value, offset, noAssert);
        return this.setUint8(offset, value);
      },
      writeUInt16LE: function(value, offset, noAssert){
        write16u_ast(this, value, offset, noAssert);
        return this.setUint16(offset, value, true);
      },
      writeUInt16BE: function(value, offset, noAssert){
        write16u_ast(this, value, offset, noAssert);
        return this.setUint16(offset, value, false);
      },
      writeUInt32LE: function(value, offset, noAssert){
        write32u_ast(this, value, offset, noAssert);
        return this.setUint32(offset, value, true);
      },
      writeUInt32BE: function(value, offset, noAssert){
        write32u_ast(this, value, offset, noAssert);
        return this.setUint32(offset, value, false);
      },
      /* writeInts */
      writeInt8: function(value, offset, noAssert){
        write8s_ast(this, value, offset, noAssert);
        return this.setInt8(offset, value);
      },
      writeInt16LE: function(value, offset, noAssert){
        write16s_ast(this, value, offset, noAssert);
        return this.setInt16(offset, value, true);
      },
      writeInt16BE: function(value, offset, noAssert){
        write16s_ast(this, value, offset, noAssert);
        return this.setInt16(offset, value, false);
      },
      writeInt32LE: function(value, offset, noAssert){
        write32s_ast(this, value, offset, noAssert);
        return this.setInt32(offset, value, true);
      },
      writeInt32BE: function(value, offset, noAssert){
        write32s_ast(this, value, offset, noAssert);
        return this.setInt32(offset, value, false);
      },
      /* writeFloats */
      writeFloatLE: function(value, offset, noAssert){
        write32_ast(this, value, offset, noAssert);
        return this.setFloat32(offset, value, true);
      },
      writeFloatBE: function(value, offset, noAssert){
        write32_ast(this, value, offset, noAssert);
        return this.setFloat32(offset, value, false);
      },
      writeDoubleLE: function(value, offset, noAssert){
        write64_ast(this, value, offset, noAssert);
        return this.setFloat64(offset, value, true);
      },
      writeDoubleBE: function(value, offset, noAssert){
        write64_ast(this, value, offset, noAssert);
        return this.setFloat64(offset, value, false);
      }
    });

  }else{
    /**
     * Function readIEEE754 and writeIEEE754 forked from
     * ysangkok's buffer-browserify
     *
     * git://github.com/toots/buffer-browserify.git
     */

    function readIEEE754(buffer, offset, isBE, mLen, nBytes) {
      var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

      i += d;

      e = s & ((1 << (-nBits)) - 1);
      s >>= (-nBits);
      nBits += eLen;
      for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

      m = e & ((1 << (-nBits)) - 1);
      e >>= (-nBits);
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity);
      } else {
        m = m + pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * pow(2, e - mLen);
    }

    function writeIEEE754(buffer, value, offset, isBE, mLen, nBytes) {
      var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? pow(2, -24) - pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

      value = M.abs(value);

      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = M.floor(M.log(value) / M.LN2);
        if (value * (c = pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }

        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * pow(2, eBias - 1) * pow(2, mLen);
          e = 0;
        }
      }

      for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

      e = (e << mLen) | m;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

      buffer[offset + i - d] |= s * 128;
    }

    Buffer = function(data, encoding){
      if(!(this instanceof Buffer)){
        return new Buffer(data, encoding);
      }

    };
  }

  mix(Buffer, {
    isBuffer: function(obj){
      return obj instanceof Buffer;
    },
    byteLength: function(string, encoding){

    }
  });

  mix(Buffer.prototype, {
    INSPECT_MAX_BYTES: 50,
    write: function(string, offset, length, encoding){

    },
    copy: function(targetBuffer, targetStart, sourceStart, sourceEnd){

    },
    fill: function(value, offset, end){

    },
    toString: function(enc){
      if(!enc){
        var bytes = '',
        h,
        i = 0;
        for(; i < M.min(this.INSPECT_MAX_BYTES, this.length); ){
          h = this.readUInt8(i++).toString(16);
          bytes += ' ' + (h.length < 2 ? '0' : '') + h;
        }
        return '<Buffer' + bytes + (i < this.length ? ' ... ' : '') + '>';
      }
    }
  });

  if(typeof window != und){
    window.Buffer = Buffer;
  }
})();
