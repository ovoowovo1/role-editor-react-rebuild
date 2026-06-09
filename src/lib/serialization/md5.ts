function rotateLeft(value: number, shift: number): number {
  return (value << shift) | (value >>> (32 - shift));
}

function addUnsigned(left: number, right: number): number {
  return (left + right) >>> 0;
}

function utf8Bytes(input: string): number[] {
  return Array.from(new TextEncoder().encode(input));
}

function wordToHex(value: number): string {
  let output = '';
  for (let index = 0; index < 4; index += 1) {
    output += ((value >>> (index * 8)) & 0xff).toString(16).padStart(2, '0');
  }
  return output;
}

export function md5Hex(input: string): string {
  const bytes = utf8Bytes(input);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let index = 0; index < 8; index += 1) {
    bytes.push(Math.floor(bitLength / 2 ** (8 * index)) & 0xff);
  }

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const shifts = [
    7, 12, 17, 22,
    5, 9, 14, 20,
    4, 11, 16, 23,
    6, 10, 15, 21
  ];

  const constants = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0);

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    const words = new Array<number>(16);
    for (let index = 0; index < 16; index += 1) {
      const offset = chunk + index * 4;
      words[index] =
        bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24);
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
        shift = shifts[index % 4];
      } else if (index < 32) {
        f = (dd & bb) | (~dd & cc);
        g = (5 * index + 1) % 16;
        shift = shifts[4 + (index % 4)];
      } else if (index < 48) {
        f = bb ^ cc ^ dd;
        g = (3 * index + 5) % 16;
        shift = shifts[8 + (index % 4)];
      } else {
        f = cc ^ (bb | ~dd);
        g = (7 * index) % 16;
        shift = shifts[12 + (index % 4)];
      }

      const temp = dd;
      dd = cc;
      cc = bb;
      bb = addUnsigned(bb, rotateLeft(addUnsigned(addUnsigned(aa, f), addUnsigned(constants[index], words[g])), shift));
      aa = temp;
    }

    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }

  return `${wordToHex(a)}${wordToHex(b)}${wordToHex(c)}${wordToHex(d)}`;
}
