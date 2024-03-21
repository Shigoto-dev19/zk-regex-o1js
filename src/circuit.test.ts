//TODO Add MINA string regex test example

import { Field, Bool, Provable } from 'o1js';
import { simpleRegex } from './examples';

//TODO use `Bytes.fromString(input).toFields()` instead
function padString(str: string, paddedBytesSize?: number): Field[] {
    const strBytes = Buffer.from(str, 'utf-8'); // Convert string to bytes
    const paddedBytes = [...strBytes]; // Convert bytes to array

    // Add padding with zeros
    if (paddedBytesSize)
    while (paddedBytes.length < paddedBytesSize) {
        paddedBytes.push(0);
    }

    return paddedBytes.map(Field);
}

describe("Simple Regex", () => {
  it("case 1", async () => {
    const input = "1=a 2=b d";
    const paddedStr = padString(input, 64);

    const isValid = simpleRegex(paddedStr);
    Provable.log('witness: ', isValid);
    expect(isValid).toEqual(Bool(true));
    // const revealedIdx = [[2], [6], [8]];
    // for (let substr_idx = 0; substr_idx < 3; ++substr_idx) {
    //   for (let idx = 0; idx < 64; ++idx) {
    //     if (revealedIdx[substr_idx].includes(idx)) {
    //       expect(BigInt(paddedStr[idx])).toEqual(
    //         witness[2 + 64 * substr_idx + idx]
    //       );
    //     } else {
    //       expect(0n).toEqual(witness[2 + 64 * substr_idx + idx]);
    //     }
    //   }
    // }
  });

  it("case 2", async () => {
    const input = "1=a 2=b 2=bc 2=c d";
    const paddedStr = padString(input, 64);
   
    const isValid = simpleRegex(paddedStr);

    expect(isValid).toEqual(Bool(true));

    // for (let substr_idx = 0; substr_idx < 3; ++substr_idx) {
    //   for (let idx = 0; idx < 64; ++idx) {
    //     if (revealedIdx[substr_idx].includes(idx)) {
    //       expect(BigInt(paddedStr[idx])).toEqual(
    //         witness[2 + 64 * substr_idx + idx]
    //       );
    //     } else {
    //       expect(0n).toEqual(witness[2 + 64 * substr_idx + idx]);
    //     }
    //   }
    // }
  });

  it("case 3", async () => {
    const input = "1=b 2=c d";
    const paddedStr = padString(input, 64);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(true));

    // const revealedIdx = [
    //   [2, 22],
    //   [6, 10, 11, 15, 26, 27, 31, 35],
    //   [17, 37],
    // ];
    // for (let substr_idx = 0; substr_idx < 3; ++substr_idx) {
    //   for (let idx = 0; idx < 64; ++idx) {
    //     if (revealedIdx[substr_idx].includes(idx)) {
    //       expect(BigInt(paddedStr[idx])).toEqual(
    //         witness[2 + 64 * substr_idx + idx]
    //       );
    //     } else {
    //       expect(0n).toEqual(witness[2 + 64 * substr_idx + idx]);
    //     }
    //   }
    // }
  });

  it("case 4", async () => {
    const input = "1=a 2=b d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(true));
  });

  it("case 5", async () => {
    const input = "1=b 2=bbccccc d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(true));
  });

  it("case 6", async () => {
    const input = "1=b 2=c d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(true));
  });

  it("case 7", async () => {
    const input = "1=b 2=bbccccc d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(true));
  });

  it("unhappy case 1: missing required part '1='", async () => {
    const input = "2=bc";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(false));
  });

  it("unhappy case 2: missing required part '2='", async () => {
    const input = "1=a";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(false));
  });

  it("unhappy case 3: missing required final character 'd'", async () => {
    const input = "1=a 2=bbbccc";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(false));
  });

  it("unhappy case 4: invalid character 'j' after '1='", async () => {
    const input = "1=j 2=bbcc d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(false));
  });

  it("unhappy case 5: final character 'd' is attched to '2='", async () => {
    const input = "1=a 2=bd";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(false));
  });

  it("unhappy case 6: invalid character 'k' after '2='", async () => {
    const input = "1=a 2=ck";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(false));
  });

  it("unhappy case 7: missing required character 'b' or 'c' after '2='", async () => {
    const input = "1=a 2=fl";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(false));
  });

  it("unhappy case 8: invalid character 'f' after many characters 'c' after '2='", async () => {
    const input = "1=a 2=bbcccf d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Bool(false));
  });
});