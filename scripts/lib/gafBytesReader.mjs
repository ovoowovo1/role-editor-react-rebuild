/**
 * Little-endian binary reader aligned with PixiGAFPlayer GAFBytesInput (Haxe BytesInput).
 */

export class GafBytesReader {
  /** @param {Buffer} buf */
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }

  get length() {
    return this.buf.length;
  }

  /** @returns {number} unsigned byte */
  readByte() {
    const v = this.buf.readUInt8(this.pos);
    this.pos += 1;
    return v;
  }

  /** Signed byte */
  readSByte() {
    const v = this.readByte();
    return v > 127 ? v - 256 : v;
  }

  readUint16() {
    const v = this.buf.readUInt16LE(this.pos);
    this.pos += 2;
    return v;
  }

  readInt16() {
    const v = this.buf.readUInt16LE(this.pos);
    this.pos += 2;
    return v > 32767 ? v - 65536 : v;
  }

  readUint32() {
    const v = this.buf.readUInt32LE(this.pos);
    this.pos += 4;
    return v >>> 0;
  }

  readInt32() {
    return this.buf.readInt32LE((this.pos += 4) - 4);
  }

  readFloat() {
    const v = this.buf.readFloatLE(this.pos);
    this.pos += 4;
    return v;
  }

  readBoolean() {
    return this.readSByte() !== 0;
  }

  readUTF() {
    const len = this.readUint16();
    const str = this.buf.toString('utf8', this.pos, this.pos + len);
    this.pos += len;
    return str;
  }

  skip(n) {
    this.pos += n;
  }

  ensure(bytes) {
    if (this.pos + bytes > this.buf.length) {
      throw new Error(`GAF parse overrun: need ${bytes} bytes at offset ${this.pos}, len=${this.buf.length}`);
    }
  }
}
