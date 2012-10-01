(function(){
  var M = Math,
  pow = M.pow,
  und = 'undefined',
  c2c = String.fromCharCode,
  non_enc = /[^0-9a-z]/g,
  encodings = {
    ascii:0,
    utf8:0,
    ucs2:0,
    hex:0,
    base64:0,
    binary:0
  },
  non_hex = /[^0-9A-Fa-f]/g,
  Buffer;

  function mix(dst, src, safe){
    for(var i in src){
      if((!(i in dst) || !safe)){
        dst[i] = src[i];
      }
    }
    return dst;
  }

  /* string to utf8 encode */
  function u8e(str){
    return unescape(encodeURIComponent(str));
  }

  /* utf8 to string decode */
  function u8d(str){
    return decodeURIComponent(escape(str));
  }

  /* string to ucs2 encode */
  function u2e(str){
    var ret = '',
    i = 0,
    val;
    for(; i < str.length; ){
      val = str.charCodeAt(i++);
      ret += c2c(val % 256) + c2c(val >>> 8);
    }
    return ret;
  }

  /* ucs2 to string decode */
  function u2d(str){
    var ret = '',
    i = 0;
    for(; i < str.length; ){
      ret += c2c(str.charCodeAt(i++) + (str.charCodeAt(i++) << 8));
    }
    return ret;
  }

  /* hex to binary encode */
  function hxe(str){
    var ret = '',
    i = 0;
    for(; i < str.length; i++){
      ret += String.fromCharCode(parseInt(str.substr(i++, 2), 16));
    }
    return ret;
  }

  /* binary to hex decode */
  function hxd(str){
    var ret = '',
    i = 0,
    c;
    for(; i < str.length; ){
      c = str.charCodeAt(i++).toString(16);
      for(; c.length < 2; c = '0' + c);
      ret += c;
    }
    return ret;
  }

  /* Assertion Helper */
  function ast(val, msg){
    if(!val){
      throw new Error(msg);
    }
  }

  /* Encoding Assertion Helper */
  function enc_ast(encoding){
    encoding = (encoding || 'utf8').toLowerCase().replace(non_enc, '');
    ast(encoding in encodings, 'Unknown encoding');
    return encoding;
  }

  /* Hex String Assertion Helper */
  function hex_ast(val){
    ast(!(val.length % 2) && val.search(non_hex) < 0, 'Invalid hex string');
  }

  /* Initial Buffer Length Helper */
  function buffer_len(data, encoding){
    encoding = enc_ast(encoding);
    if(typeof data == 'number'){
      return data > 0 ? data : 0;
    }else if(typeof data == 'string'){
      return Buffer.byteLength(data, encoding);
    }else if(data instanceof Array){
      return data.length;
    }
    return 0;
  }

  function buffer_write(self, data, encoding){
    if(typeof data == 'string'){
      self.write(data, 0, self.length, encoding);
    }else if(data instanceof Array){
      for(var i = 0; i < data.length; i++){
        //self['write' + (data[i] < 0 ? '' : 'U') + 'Int8'](data[i], i);
        self.writeUInt8(data[i], i, true);
      }
    }
  }

  /* Slice Assertion Helper */
  function slice_ast(self, start, end){
    ast(start >= 0 && start < end && end <= self.length, 'oob');
  }

  /* Get Assertion Helper */
  function get_ast(self, offset, noAssert, bytes){
    if (!noAssert) {
      ast(offset !== undefined && offset !== null, 'missing offset');
      ast(offset >= 0, 'trying to read at negative offset');
      ast(offset + bytes <= self.length, 'Trying to read beyond buffer length');
    }
  }

  /* Set Assertion Helper */
  function set_ast(self, value, offset, noAssert, bytes, max, min, fract){
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
      set_ast(self, value, offset, noAssert, bytes, max, min, fract);
    } : function(self, offset, noAssert){ /* read_ast */
      get_ast(self, offset, noAssert, bytes);
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
      var len = buffer_len(data, encoding),
      buf = wrap(new ArrayBuffer(len), 0, len);
      buffer_write(buf, data, encoding);
      return buf;
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
      encoding = enc_ast(encoding);
      ast(typeof string == 'string', 'Argument must be a string');
      switch(encoding){
      case 'ascii':
      case 'binary':
        return string.length;
      case 'hex':
        //hex_ast(string); /* NodeJS don't checks it here, so we also keep this feature */
        return string.length >>> 1;
        //return M.ceil(string.length / 2);
      case 'base64':
        var e = string.search(/=/);
        return (string.length * 3 >>> 2) - (e < 0 ? 0 : (string.length - e));
      case 'ucs2':
        return string.length * 2;
      case 'utf8':
      default:
        return u8e(string).length;
        // function u8l(string){
        /*var t,
        c = 0,
        i = 0;
        for(; i < string.length; ){
          t = string.charCodeAt(i++);
          for(c++; t >>>= 8; c++);
        }
        return c;*/
        // }
      }
    }
  });

  mix(Buffer.prototype, {
    /* Buffer value access */
    /* Buffer operations */
    write: function(string, offset, length, encoding){
      var self = this,
      i = 0;
      offset = offset || 0;
      length = length || self.length - offset;
      /* Assertion */
      ast(typeof string == 'string', 'Argument must be a string');
      encoding = enc_ast(encoding);
      /* Decode source string with specified encoding to binary string */
      string = encoding == 'utf8' ? u8e(string) :
        encoding == 'ucs2' ? u2e(string) :
        encoding == 'hex' ? hxe(string) :
        encoding == 'base64' ? atob(string) :
        string;
      /* Write binary string to buffer */
      for(; i < string.length; self.writeUInt8(string.charCodeAt(i), offset + i++));
    },
    copy: function(target, offset, start, end){
      offset = offset || 0;
      start = start || 0;
      var self = this,
      i = start;
      end = end || self.length;
      /* Assertion */
      ast(end >= start, 'sourceEnd < sourceStart');
      ast(offset >= 0 && offset < target.length, 'targetStart out of bounds');
      ast(start >= 0 && start < self.length, 'sourceStart out of bounds');
      ast(end >= 0 && end <= self.length, 'sourceEnd out of bounds');
      /* Copy */
      for(; i < end; target.writeUInt8(self.readUInt8(i), offset + i++));
    },
    fill: function(value, offset, end){
      offset = offset || 0;
      var self = this,
      i = offset;
      end = end || self.length;
      if(typeof value == 'string'){
        value = value.charCodeAt(0); // (sic!) no ucs2 check
      }
      /* Assertion */
      ast(typeof value === 'number' && !isNaN(value), 'value is not a number');
      ast(end >= offset, 'end < start');
      ast(offset >= 0 && offset < self.length, 'start out of bounds');
      ast(end > 0 && end <= self.length, 'end out of bounds');
      /* Fill */
      for(; i < end; self.writeUInt8(value, i++));
    },
    INSPECT_MAX_BYTES: 50,
    inspect: function(length){
      var self = this,
      i = 0,
      bytes = '',
      h;
      length = M.min(self.INSPECT_MAX_BYTES, self.length, length || self.length);
      for(; i < length; ){
        h = self.readUInt8(i++).toString(16);
        bytes += ' ' + (h.length < 2 ? '0' : '') + h;
      }
      return '<Buffer' + bytes + (i < self.length ? ' ... ' : '') + '>';
    },
    toString: function(encoding, start, end){
      var self = this,
      i = start || 0,
      r = '';
      if(arguments.length < 1){
        return self.inspect();
      }
      start = i;
      end = end || self.length;
      /* Accertion */
      encoding = enc_ast(encoding);
      /* Produce binary string from buffer data */
      for(; i < end; r += String.fromCharCode(self.readUInt8(i++)));
      /* Decode binary string to specified encoding */
      return encoding == 'utf8' ? u8d(r) :
        encoding == 'ucs2' ? u2d(r) :
        encoding == 'hex' ? hxd(r) :
        encoding == 'base64' ? btoa(r) :
        r;
    }
  });

  if(typeof window != und){
    window.Buffer = Buffer;
  }
})();
