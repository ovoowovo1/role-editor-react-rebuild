function rotateLeft(value: number, shift: number): number {
  return (value << shift) | (value >>> (32 - shift));
}

function addUnsigned(left: number, right: number): number {
  return (left + right) >>> 0;
}

const md5Encoder = new TextEncoder();
const MD5_SHIFTS = [
  7, 12, 17, 22,
  5, 9, 14, 20,
  4, 11, 16, 23,
  6, 10, 15, 21
];
const MD5_CONSTANTS = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0);

function wordToHex(value: number): string {
  let output = '';
  for (let index = 0; index < 4; index += 1) {
    output += ((value >>> (index * 8)) & 0xff).toString(16).padStart(2, '0');
  }
  return output;
}

/** Legacy thumbnail checksum, not a cryptographic security primitive. */
export function md5Hex(input: string): string {
  const bytes = md5Encoder.encode(input);
  // Full blocks are read directly from the UTF-8 buffer. Only the final
  // one or two blocks need a copy for the padding marker and length.
  const full = bytes.length - (bytes.length % 64);
  const remaining = bytes.length - full;
  const tail = new Uint8Array(remaining < 56 ? 64 : 128);
  tail.set(bytes.subarray(full));
  tail[remaining] = 0x80;
  const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tailView = new DataView(tail.buffer);
  // Split byteLength * 8 into two little-endian 32-bit words.
  tailView.setUint32(tail.length - 8, bytes.length * 8, true);
  tailView.setUint32(tail.length - 4, Math.floor(bytes.length / (2 ** 29)), true);

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const words = new Int32Array(16);
  for (let chunk = 0; chunk < full + tail.length; chunk += 64) {
    const view = chunk < full ? dataView : tailView;
    const start = chunk < full ? chunk : chunk - full;
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getInt32(start + index * 4, true);
    }

    let aa = a;
    let bb = b;
    let cc = c;
    let dd = d;

    for (let index = 0; index < 64; index += 1) {
      let f = 0;
      let g = 0;
      let shift = 0;

      if (index < 16) {
        f = (bb & cc) | (~bb & dd);
        g = index;
        shift = MD5_SHIFTS[index % 4];
      } else if (index < 32) {
        f = (dd & bb) | (~dd & cc);
        g = (5 * index + 1) % 16;
        shift = MD5_SHIFTS[4 + (index % 4)];
      } else if (index < 48) {
        f = bb ^ cc ^ dd;
        g = (3 * index + 5) % 16;
        shift = MD5_SHIFTS[8 + (index % 4)];
      } else {
        f = cc ^ (bb | ~dd);
        g = (7 * index) % 16;
        shift = MD5_SHIFTS[12 + (index % 4)];
      }

      const temp = dd;
      dd = cc;
      cc = bb;
      bb = addUnsigned(bb, rotateLeft(addUnsigned(addUnsigned(aa, f), addUnsigned(MD5_CONSTANTS[index], words[g])), shift));
      aa = temp;
    }

    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }

  return `${wordToHex(a)}${wordToHex(b)}${wordToHex(c)}${wordToHex(d)}`;
}
