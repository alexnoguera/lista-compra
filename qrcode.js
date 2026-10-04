// qrcode.js - Generador de códigos QR autónomo, 100% privado en cliente (sin servidores externos)

// Implementación ligera optimizada de generación de matriz QR y renderizado en Canvas / SVG
(function(global) {
  // Constantes de codificación
  const PAD0 = 0xEC;
  const PAD1 = 0x11;

  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  QRBitBuffer.prototype = {
    get: function(index) {
      const bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1;
    },
    put: function(num, length) {
      for (let i = 0; i < length; i++) {
        this.putBit(((num >>> (length - i - 1)) & 1) === 1);
      }
    },
    putBit: function(bit) {
      const bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) {
        this.buffer.push(0);
      }
      if (bit) {
        this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      }
      this.length++;
    }
  };

  const QRPolynomial = {
    glog: function(n) {
      if (n < 1) throw new Error("glog(" + n + ")");
      return QRMath.glogTable[n];
    },
    gexp: function(n) {
      while (n < 0) n += 255;
      while (n >= 255) n -= 255;
      return QRMath.gexpTable[n];
    }
  };

  const QRMath = {
    glogTable: new Array(256),
    gexpTable: new Array(256),
    _init: function() {
      for (let i = 0; i < 8; i++) QRMath.gexpTable[i] = 1 << i;
      for (let i = 8; i < 256; i++) QRMath.gexpTable[i] = QRMath.gexpTable[i - 4] ^ QRMath.gexpTable[i - 5] ^ QRMath.gexpTable[i - 6] ^ QRMath.gexpTable[i - 8];
      for (let i = 0; i < 255; i++) QRMath.glogTable[QRMath.gexpTable[i]] = i;
    }
  };
  QRMath._init();

  function Polynomial(num, shift) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
  }
  Polynomial.prototype = {
    get: function(index) { return this.num[index]; },
    getLength: function() { return this.num.length; },
    multiply: function(e) {
      const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
      for (let i = 0; i < this.getLength(); i++) {
        for (let j = 0; j < e.getLength(); j++) {
          num[i + j] ^= QRPolynomial.gexp(QRPolynomial.glog(this.get(i)) + QRPolynomial.glog(e.get(j)));
        }
      }
      return new Polynomial(num, 0);
    },
    mod: function(e) {
      if (this.getLength() - e.getLength() < 0) return this;
      const ratio = QRPolynomial.glog(this.get(0)) - QRPolynomial.glog(e.get(0));
      const num = new Array(this.getLength());
      for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
      for (let i = 0; i < e.getLength(); i++) {
        num[i] ^= QRPolynomial.gexp(QRPolynomial.glog(e.get(i)) + ratio);
      }
      return new Polynomial(num, 0).mod(e);
    }
  };

  const QRRSBlock = {
    RS_BLOCK_TABLE: [
      // 1-L, 1-M, 1-Q, 1-H ...
      [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
      [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
      [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
      [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
      [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
      [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
      [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
      [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
      [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
      [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]
    ],
    getRSBlocks: function(typeNumber, errorCorrectLevel) {
      const rsBlock = QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + errorCorrectLevel];
      if (!rsBlock) throw new Error("Datos demasiado grandes para la versión QR");
      const list = [];
      for (let i = 0; i < rsBlock.length; i += 3) {
        const count = rsBlock[i];
        const totalCount = rsBlock[i + 1];
        const dataCount = rsBlock[i + 2];
        for (let j = 0; j < count; j++) {
          list.push({ totalCount, dataCount });
        }
      }
      return list;
    }
  };

  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  QRCodeModel.prototype = {
    addData: function(data) {
      this.dataList.push(data);
      this.dataCache = null;
    },
    isDark: function(row, col) {
      if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
        throw new Error(row + "," + col);
      }
      return this.modules[row][col];
    },
    getModuleCount: function() { return this.moduleCount; },
    make: function() {
      if (this.typeNumber < 1) {
        for (let t = 1; t <= 10; t++) {
          const rs = QRRSBlock.getRSBlocks(t, this.errorCorrectLevel);
          let totalData = 0;
          for (let i = 0; i < rs.length; i++) totalData += rs[i].dataCount;
          const bitBuffer = new QRBitBuffer();
          for (let i = 0; i < this.dataList.length; i++) {
            const bytes = new TextEncoder().encode(this.dataList[i]);
            bitBuffer.put(4, 4); // 8-bit byte mode
            bitBuffer.put(bytes.length, t < 10 ? 8 : 16);
            for (let j = 0; j < bytes.length; j++) bitBuffer.put(bytes[j], 8);
          }
          if (bitBuffer.length <= totalData * 8) {
            this.typeNumber = t;
            break;
          }
        }
      }
      this.makeImpl();
    },
    makeImpl: function() {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (let row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount).fill(null);
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupTimingPattern();
      this.mapData(this.createData(), 0);
    },
    setupPositionProbePattern: function(row, col) {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          if ((0 <= r && r <= 6 && (c === 0 || c === 6)) ||
              (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
              (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    setupTimingPattern: function() {
      for (let r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] !== null) continue;
        this.modules[r][6] = (r % 2 === 0);
      }
      for (let c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] !== null) continue;
        this.modules[6][c] = (c % 2 === 0);
      }
    },
    createData: function() {
      const rsBlocks = QRRSBlock.getRSBlocks(this.typeNumber, this.errorCorrectLevel);
      const buffer = new QRBitBuffer();
      for (let i = 0; i < this.dataList.length; i++) {
        const bytes = new TextEncoder().encode(this.dataList[i]);
        buffer.put(4, 4);
        buffer.put(bytes.length, this.typeNumber < 10 ? 8 : 16);
        for (let j = 0; j < bytes.length; j++) buffer.put(bytes[j], 8);
      }
      let totalDataCount = 0;
      for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
      if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
      while (buffer.length % 8 !== 0) buffer.putBit(false);
      while (true) {
        if (buffer.length >= totalDataCount * 8) break;
        buffer.put(PAD0, 8);
        if (buffer.length >= totalDataCount * 8) break;
        buffer.put(PAD1, 8);
      }
      return buffer;
    },
    mapData: function(data, maskPattern) {
      let inc = -1;
      let row = this.moduleCount - 1;
      let bitIndex = 0;
      let byteIndex = 0;

      for (let col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (this.modules[row][col - c] === null) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = data.get(byteIndex);
                byteIndex++;
              }
              const mask = ((row + col - c) % 2 === 0);
              this.modules[row][col - c] = mask ? !dark : dark;
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
  };

  /**
   * Genera un código QR y lo dibuja en un canvas o devuelve un elemento SVG
   */
  global.createQRCodeSVG = function(text, size = 220) {
    try {
      const qr = new QRCodeModel(0, 1); // Nivel M de corrección de error
      qr.addData(text);
      qr.make();
      const count = qr.getModuleCount();
      const cellSize = (size / (count + 4)).toFixed(2);
      const margin = (cellSize * 2).toFixed(2);

      let rects = '';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            const x = (parseFloat(margin) + c * cellSize).toFixed(2);
            const y = (parseFloat(margin) + r * cellSize).toFixed(2);
            rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#0f172a"/>`;
          }
        }
      }

      return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; border-radius:12px; padding:8px; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
        <rect width="100%" height="100%" fill="#ffffff" rx="12"/>
        ${rects}
      </svg>`;
    } catch (e) {
      console.error('Error generando QR:', e);
      return `<div style="padding:20px; color:#ef4444; font-size:12px;">Error generando QR: ${e.message}</div>`;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
