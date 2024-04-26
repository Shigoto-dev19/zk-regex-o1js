import { Bool, Field } from 'o1js';
import {
  simpleRegex, 
  emailRegex, 
  base64Regex, 
  minaRegex,
  negateRegex,
  // negateVowel,
} from './examples';

//TODO Refactor tests
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

function utf8BytesToString(bytes: bigint[]): string {
  let utf8String = '';
  let codepoint = 0;
  let remainingBytes = 0;

  for (const byte of bytes.map(Number)) {
      if (remainingBytes === 0) {
          if (byte <= 0x7F) {
              // Single byte character (ASCII)
              utf8String += String.fromCharCode(Number(byte));
          } else if (byte >= 0xC0 && byte <= 0xDF) {
              // Two byte character
              codepoint = byte & 0x1F;
              remainingBytes = 1;
          } else if (byte >= 0xE0 && byte <= 0xEF) {
              // Three byte character
              codepoint = byte & 0x0F;
              remainingBytes = 2;
          } else if (byte >= 0xF0 && byte <= 0xF7) {
              // Four byte character
              codepoint = byte & 0x07;
              remainingBytes = 3;
          }
      } else {
          // Continuation byte
          codepoint = (codepoint << 6) | (byte & 0x3F);
          remainingBytes--;

          if (remainingBytes === 0) {
              utf8String += String.fromCharCode(codepoint);
          }
      }
  }

  return utf8String;
}

// 1=(a|b) (2=(b|c)+ )+d
describe("Simple Regex", () => {
  it("should accept valid input: case 1", () => {
    const input = "1=a 2=b d";
    const paddedStr = padString(input, 64);

    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });

  it("should accept valid input: case 2", async () => {
    const input = "1=a 2=b 2=bc 2=c d";
    const paddedStr = padString(input, 64);
   
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });

  it("should accept valid input: case 3", async () => {
    const input = "1=b 2=c d";
    const paddedStr = padString(input, 64);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });

  it("should accept valid input: case 4", async () => {
    const input = "1=a 2=b d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });

  it("should accept valid input: case 5", async () => {
    const input = "1=b 2=bbccccc d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });

  it("should accept valid input: case 6", async () => {
    const input = "1=b 2=c d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });

  it("should accept valid input: case 7", async () => {
    const input = "1=b 2=bbccccc d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });

  it("should reject invalid input: case 1: missing required part '1='", async () => {
    const input = "2=bc";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false))
  });

  it("should reject invalid input: case 2: missing required part '2='", async () => {
    const input = "1=a";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false))
  });

  it("should reject invalid input: case 3: missing required final character 'd'", async () => {
    const input = "1=a 2=bbbccc";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false))
  });

  it("should reject invalid input: case 4: invalid character 'j' after '1='", async () => {
    const input = "1=j 2=bbcc d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false))
  });

  it("should reject invalid input: case 5: final character 'd' is attched to '2='", async () => {
    const input = "1=a 2=bd";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false))
  });

  it("should reject invalid input: case 6: invalid character 'k' after '2='", async () => {
    const input = "1=a 2=ck";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false))
  });

  it("should reject invalid input: case 7: missing required character 'b' or 'c' after '2='", async () => {
    const input = "1=a 2=fl";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false))
  });

  it("should reject invalid input: case 8: invalid character 'f' after many characters 'c' after '2='", async () => {
    const input = "1=a 2=bbcccf d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false))
  });
});

// ([a-zA-Z0-9._%-=]+@[a-zA-Z0-9.-]+.[a-z])
describe("Email Regex", () => {
  describe('username', () => {
    it("should accept valid input: username is alphabetic", () => {
      const input = "marcoPollo@expertcodebolg.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it("should accept valid input: username is alphabetic lowercase", () => {
      const input = "mina@blockchain.xyz";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it("should accept valid input: username is alphabetic uppercase", () => {
      const input = "CONSTANT@input.zk";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });
  
    it("should accept valid input: username is alphanumeric", () => {
      const input = "halo2Spartian@hotmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });
  
    it("should accept valid input: username is numeric", () => {
      const input = "007@spy.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });
    
    it("should accept valid input: username contains .", () => {
      const input = "hello.world@gmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it("should accept valid input: username contains _", () => {
      const input = "hello_world@gmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it("should accept valid input: username contains %", () => {
      const input = "hello%world@gmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it("should accept valid input: username contains -", () => {
      const input = "shigoto-dev19@protonmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });
  
    it("should accept valid input: username contains =", () => {
      const input = "hello=world@gmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it("should reject invalid input: missing username", () => {
      const input = "@protonmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false))
    });

    it("should reject invalid input: username contains invalid character #", () => {
      const input = "shigoto#@protonmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false))
    });

    it("should reject invalid input: username contains invalid character +", () => {
      const input = "shigoto+@protonmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false))
    });
  });

  describe('symbol', () => {
    it('should accept valid input: symbol=@', () =>{
      const input = "hello@world.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it('should reject invalid input: missing symbol', () =>{
      const input = "helloworld.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });

    it('should reject invalid input: symbol=#', () =>{
      const input = "hello#world.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });

    it('should reject invalid input: symbol=+', () =>{
      const input = "hello+world.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });

    it('should reject invalid input: symbol=!', () =>{
      const input = "hello!world.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });
  });

  describe('mail server', () => {
    it("should accept valid input: domain is alphabetic", () => {
      const input = "hello@CoolWorld.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it("should accept valid input: domain is alphabetic lowercase", () => {
      const input = "ninja@gaiden.xyz";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it("should accept valid input: domain is alphabetic uppercase", () => {
      const input = "CONSTANT@INPUT.output";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });
  
    it("should accept valid input: domain is alphanumeric", () => {
      const input = "Trojan@Horse7.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });
  
    it("should accept valid input: domain is numeric", () => {
      const input = "spy@007.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });
    
    it("should accept valid input: domain contains .", () => {
      const input = "hello@beautiful.WORLD.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it("should accept valid input: domain contains -", () => {
      const input = "hello@cool-world.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it("should reject invalid input: missing mail server", () => {
      const input = "shigoto-dev19@.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false))
    });

    it("should reject invalid input: domain contains invalid character %", () => {
      const input = "hello@meine%liebe.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });

    it("should reject invalid input: domain contains invalid character _", () => {
      const input = "shigoto-dev19@proton_mail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });
  
    it("should reject invalid input: domain contains invalid character =", () => {
      const input = "hello@sevgili=dunya.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });

    it("should reject invalid input: domain contains invalid character #", () => {
      const input = "shigoto@proto#nmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false))
    });

    it("should reject invalid input: domain contains invalid character +", () => {
      const input = "shigoto@proton+mail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });
  });

  describe('domain', () => {
    it("should accept valid input: domain is alphabetic lowercase", () => {
      const input = "hey@there.buddy";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(true));
    });

    it("should reject invalid input: missing .", () => {
      const input = "shigoto-dev19@com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false))
    });

    it("should reject invalid input: missing domain", () => {
      const input = "shigoto-dev19@.";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false))
    });

    it("should reject invalid input: domain is alphabetic uppercase", () => {
      const input = "hola@atodos.COM";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });
  
    it("should reject invalid input: domain is alphanumeric", () => {
      const input = "Trojan@Horse7.6com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });
  
    it("should reject invalid input: domain is numeric", () => {
      const input = "spy@007.123";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });
    
    it("should reject invalid input: domain contains invalid character $", () => {
      const input = "hello@beautiful.WORLD.$com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });

    it("should reject invalid input: domain contains invalid character %", () => {
      const input = "hello@meine%liebe.com%";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid.out).toEqual(Bool(false));
    });
  });
});

// ([a-zA-Z0-9]|\\+|/|=)+
describe("Base64 Regex", () => {
  it("should accept valid input: alphabetic lowercase", () => {
    const input = "jkjasldfjlskdf";
    const paddedStr = padString(input);

    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length));
  });

  it("should accept valid input: alphabetic uppercase", () => {
    const input = "KDSFASDFSD";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length));
  });

  it("should accept valid input: alphabetic", () => {
    const input = "dfsADAFSksFD";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length));
  });

  it("should accept valid input: numeric", () => {
    const input = "8928343242";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length));
  });

  it("should accept valid input: alphanumeric", () => {
    const input = "sdfAE23dFAc";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length));
  });

  it("should accept valid input: alphanumeric with + character", () => {
    const input = "12Qsa+SDFsds";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length));
  });

  it("should accept valid input: alphanumeric with / character", () => {
    const input = "Ad234dfED/sdfaZ";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length));
  });

  it("should accept valid input: alphanumeric with = character", () => {
    const input = "ywZJU124=jsfd3";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length));
  });

  it("should accept valid BASE64 input: case1", () => {
    const input = "M/Dsdf=QW+pD";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length));
  });

  it("should accept valid BASE64 input: case2", () => {
    const input = "F/zND+U2Nzg5MA==";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length));
  });

  it("should accept valid BASE64 input: case3", () => {
    const input = "5p2x5aW95YiW44Gv44CB44GC=/=+/+";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length));
  });

  it("should reject invalid input: invalid character .", () => {
    const input = "shigotoDev.12D";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length - 1))
  });

  it("should reject invalid input: invalid character $", () => {
    const input = "59$FORpay2MEnt=";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length - 1))
  });

  it("should reject invalid input: invalid character >", () => {
    const input = "sZW23sf=>s12/";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length - 1))
  });

  it("should reject invalid input: invalid character #", () => {
    const input = "1AQX=/EWS#p94";
    const paddedStr = padString(input);
    
    const isValid = base64Regex(paddedStr);
    expect(isValid.out).toEqual(Field(input.length - 1))
  });
});

// (mina|MINA)+
// This example demonstrates how zk-regex counts occurrences of patterns.
describe("Mina Regex", () => {
  it("should find occurence of 1 'mina' pattern: case 1", () => {
    const input = "mina";
    const paddedStr = padString(input);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(1));
  });

  it("should find occurence of 1 'mina' pattern: case 2", () => {
    const input = "stamina";
    const paddedStr = padString(input);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(1));
  });

  it("should find occurence of 1 'mina' pattern: case 3", () => {
    const input = "The terminal station is nearby";
    const paddedStr = padString(input);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(1));
  });

  it("should find occurence of 2 'mina' patterns: case 1", () => {
    const input = "I need stamina to reach the faraway terminal";
    const paddedStr = padString(input);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(2));
  });

  it("should find occurence of 2 'mina' patterns: case 2", () => {
    const input = "Amina is dominating the tournament";
    const paddedStr = padString(input);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(2));
  });

  it("should find occurence of 3 'mina' patterns", () => {
    const input = "Amina is dominating the tournament with her stamina";
    const paddedStr = padString(input);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(3));
  });

  it("should find occurence of 1 'MINA' pattern: case 1", () => {
    const input = "MINA is a succint blockchain";
    const paddedStr = padString(input);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(1));
  });

  it("should find total occurence of 2 'MINA' or 'mina' pattern", () => {
    const input = "Is MINA minable?";
    const paddedStr = padString(input);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(2));
  });

  it("should find total occurence of 3 'MINA' or 'mina' pattern", () => {
    const input = "MINAminaMINA";
    const paddedStr = padString(input);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(3));
  });

  it("should find total occurence of 4 'MINA' or 'mina' pattern", () => {
    const input = "Be luminary and illuminate, don't discriminate or eliminate";
    const paddedStr = padString(input);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(4));
  });

  it("should find no valid pattern: case 1", () => {
    const input = "Mina is a western name!";
    const paddedStr = padString(input, 64);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(0));
  });

  it("should find no valid pattern: case 2", () => {
    const input = "lol";
    const paddedStr = padString(input, 64);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(0));
  });

  it("should find no valid pattern: case 3", () => {
    const input = "MiNa doesn't count!";
    const paddedStr = padString(input, 64);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(0));
  });

  it("should find no valid pattern: case 4", () => {
    const input = "The word miniature is close enough";
    const paddedStr = padString(input, 64);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(0));
  });

  it("should find no valid pattern: case 5", () => {
    const input = "";
    const paddedStr = padString(input, 64);
    
    const isValid = minaRegex(paddedStr);
    expect(isValid.out).toEqual(Field(0));
  });
});

// a:[^abcdefghijklmnopqrstuvwxyz]+.
describe("Negate Regex", () => {
  it("should accept valid input: case 1", () => {
    const input = "a: ABCDEFG XYZ.";
    const paddedStr = padString(input);
    
    const isValid = negateRegex(paddedStr);
    // const revealedBytes = isValid.reveal[0].map(f => f.toBigInt());
    // const revealedString = utf8BytesToString(revealedBytes);
    // console.log('revealedString: ', revealedString);

    expect(isValid.out).toEqual(Bool(true));
  });

  it("should accept valid input: spanish", () => {
    // Spanish character "í" has 2 bytes.
    const input = "a: CRIPTOGRAFíA.";
    const paddedStr = padString(input);

    const isValid = negateRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });

  it("should accept valid input: japanese", () => {
    // Each Japanese character has 3 bytes.
    const input = "a: あいう.";
    const paddedStr = padString(input);
    
    const isValid = negateRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });

  it("should accept valid input: arabic", () => {
    /// Arabian character "التشفير" has 14 bytes.
    const input = "a: التشفير.";
    const paddedStr = padString(input);
    
    const isValid = negateRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });

  it("should accept valid input: contains ?#%", () => {
    const input = "a: HA?SH#ING%.";
    const paddedStr = padString(input);
    
    const isValid = negateRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });

  
  it("should not accept invalid input: 'a' missing", () => {
    const input = "b: ADSFS.";
    const paddedStr = padString(input);
    
    const isValid = negateRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false));
  });

  it("should not accept invalid input: ':' mssing", () => {
    const input = "a CRYPTO.";
    const paddedStr = padString(input);
    
    const isValid = negateRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false));
  });

  it("should not accept invalid input: missing '.' at the end", () => {
    const input = "a: FROG";
    const paddedStr = padString(input);
    
    const isValid = negateRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false));
  });

  it("should not accept invalid input: all lowercase", () => {
    const input = "a: cryptage.";
    const paddedStr = padString(input);
    
    const isValid = negateRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false));
  });

  it("should not accept invalid input: contains lowercase", () => {
    const input = "a: CryptoGraphy.";
    const paddedStr = padString(input);
    
    const isValid = negateRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(false));
  });

  it("should not accept invalid input: contains ?#%", () => {
    const input = "a: HA?SH#ING%.";
    const paddedStr = padString(input);
    
    const isValid = negateRegex(paddedStr);
    expect(isValid.out).toEqual(Bool(true));
  });
});