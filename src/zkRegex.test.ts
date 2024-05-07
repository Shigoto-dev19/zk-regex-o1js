import { Bool, Field, Bytes, UInt8 } from 'o1js';
import {
  simpleRegex, 
  emailRegex, 
  base64Regex, 
  minaRegex,
  negateRegex,
  negateVowel,
} from './examples';

function utf8BytesToString(bytes: bigint[]): string {
  let utf8String = '';
  let codepoint = 0;
  let remainingBytes = 0;

  for (const byte of bytes.map(Number)) {
    if (remainingBytes === 0) {
      if (byte <= 0x7f) {
        // Single byte character (ASCII)
        utf8String += String.fromCharCode(Number(byte));
      } else if (byte >= 0xc0 && byte <= 0xdf) {
        // Two byte character
        codepoint = byte & 0x1f;
        remainingBytes = 1;
      } else if (byte >= 0xe0 && byte <= 0xef) {
        // Three byte character
        codepoint = byte & 0x0f;
        remainingBytes = 2;
      } else if (byte >= 0xf0 && byte <= 0xf7) {
        // Four byte character
        codepoint = byte & 0x07;
        remainingBytes = 3;
      }
    } else {
      // Continuation byte
      codepoint = (codepoint << 6) | (byte & 0x3f);
      remainingBytes--;

      if (remainingBytes === 0) {
        utf8String += String.fromCharCode(codepoint);
      }
    }
  }

  return utf8String;
}

type OutputType = Field | Bool;

type ZkRegexFunction<T extends OutputType> = (input: UInt8[]) => {
  out: T;
  reveal: Field[][];
}

/**
 * Tests a zk-regex function with the given input and expected output.
 * @template T - The type of the expected output, which can be either a Field or a Bool.
 * @param zkRegexFunction - The zk-regex function to test.
 * @param input - The input string.
 * @param isValidExpected - The expected output, which can be either a Field or a Bool.
 *                          For the Bool type, it signifies whether the input matches the zk-regex pattern.
 *                          For the Field type, it represents the number of found matches according to the regex pattern.
 * @param expectedSubstring - Optional array of expected revealed substrings.
 */
function testZkRegex<T extends OutputType>(
  zkRegexFunction: ZkRegexFunction<T>,
  input: string, 
  isValidExpected: T,
  expectedSubstring?: string[]
) {
  const inputBytes = Bytes.fromString(input).bytes;

  const { out, reveal } = zkRegexFunction(inputBytes);

  if (expectedSubstring) {
    expect(reveal.length).toEqual(expectedSubstring.length);

    for (let i=0; i < reveal.length; i++) {
      const revealedBytes = reveal[i]
        .map((f) => f.toBigInt())
        .filter((byte) => byte !== 0n);
  
      const revealedSubString = utf8BytesToString(revealedBytes);
      expect(revealedSubString).toEqual(expectedSubstring[i]);
    }
  }

  expect(out).toEqual(isValidExpected);
}

// 1=(a|b) (2=(b|c)+ )+d
describe("Simple Regex: '1=(a|b) (2=(b|c)+ )+d'", () => {
  it("should accept valid input: case 1", () => {
    const input = "1=a 2=b d";
    testZkRegex(simpleRegex, input, Bool(true), ["a", "b", "d"]);
  });

  it("should accept valid input: case 2", () => {
    const input = "1=a 2=b 2=bc 2=c d";
    testZkRegex(simpleRegex, input, Bool(true), ["a", "bbcc", "d"]);
  });

  it("should accept valid input: case 3", () => {
    const input = "1=b 2=c d";
    testZkRegex(simpleRegex, input, Bool(true), ["b", "c", "d"]);
  });

  it("should accept valid input: case 4", () => {
    const input = "1=b 2=bbccccc d";
    testZkRegex(simpleRegex, input, Bool(true), ["b", "bbccccc", "d"]);
  });

  it("should accept valid input: case 5", () => {
    const input = "1=b 2=bbcc 2=cbcb d";
    testZkRegex(simpleRegex, input, Bool(true), ["b", "bbcccbcb", "d"]);
  });

  it("should reject invalid input: case 1: missing required part '1='", () => {
    const input = "2=bc";
    testZkRegex(simpleRegex, input, Bool(false));
  });

  it("should reject invalid input: case 2: missing required part '2='", () => {
    const input = "1=a";
    testZkRegex(simpleRegex, input, Bool(false));
  });

  it("should reject invalid input: case 3: missing required final character 'd'", () => {
    const input = "1=a 2=bbbccc";
    testZkRegex(simpleRegex, input, Bool(false));
  });

  it("should reject invalid input: case 4: invalid character 'j' after '1='", () => {
    const input = "1=j 2=bbcc d";
    testZkRegex(simpleRegex, input, Bool(false));
  });

  it("should reject invalid input: case 5: final character 'd' is attched to '2='", () => {
    const input = "1=a 2=bd";
    testZkRegex(simpleRegex, input, Bool(false));
  });

  it("should reject invalid input: case 6: invalid character 'k' after '2='", () => {
    const input = "1=a 2=ck";
    testZkRegex(simpleRegex, input, Bool(false));
  });

  it("should reject invalid input: case 7: missing required character 'b' or 'c' after '2='", () => {
    const input = "1=a 2=fl";
    testZkRegex(simpleRegex, input, Bool(false));
  });

  it("should reject invalid input: case 8: invalid character 'f' after many characters 'c' after '2='", () => {
    const input = "1=a 2=bbcccf d";
    testZkRegex(simpleRegex, input, Bool(false));
  });
});

// ([a-zA-Z0-9._%-=]+@[a-zA-Z0-9.-]+.[a-z])
describe("Email Regex: '([a-zA-Z0-9._%-=]+@[a-zA-Z0-9.-]+.[a-z])'", () => {
  describe('username', () => {
    it("should accept valid input: username is alphabetic", () => {
      const input = "marcoPollo@expertcodebolg.com";
      testZkRegex(emailRegex, input, Bool(true), ["marcoPollo", "expertcodebolg", "com"]);
    });

    it("should accept valid input: username is alphabetic lowercase", () => {
      const input = "mina@blockchain.xyz";
      testZkRegex(emailRegex, input, Bool(true), ["mina", "blockchain", "xyz"]);
    });

    it("should accept valid input: username is alphabetic uppercase", () => {
      const input = "CONSTANT@input.zk";
      testZkRegex(emailRegex, input, Bool(true), ["CONSTANT", "input", "zk"]);
    });
  
    it("should accept valid input: username is alphanumeric", () => {
      const input = "halo2Spartian@hotmail.com";
      testZkRegex(emailRegex, input, Bool(true), ["halo2Spartian", "hotmail", "com"]);
    });
  
    it("should accept valid input: username is numeric", () => {
      const input = "007@spy.bond";
      testZkRegex(emailRegex, input, Bool(true), ["007", "spy", "bond"]);
    });
    
    it("should accept valid input: username contains .", () => {
      const input = "hello.world@gmail.com";
      testZkRegex(emailRegex, input, Bool(true), ["hello.world", "gmail", "com"]);
    });

    it("should accept valid input: username contains _", () => {
      const input = "alice_in@wonderland.net";
      testZkRegex(emailRegex, input, Bool(true), ["alice_in", "wonderland", "net"]);
    });

    it("should accept valid input: username contains %", () => {
      const input = "hello%world@gmail.com";
      testZkRegex(emailRegex, input, Bool(true), ["hello%world", "gmail", "com"]);
    });

    it("should accept valid input: username contains -", () => {
      const input = "shigoto-dev19@protonmail.com";
      testZkRegex(emailRegex, input, Bool(true), ["shigoto-dev19", "protonmail", "com"]);
    });
  
    it("should accept valid input: username contains =", () => {
      const input = "hello=world@gmail.com";
      testZkRegex(emailRegex, input, Bool(true), ["hello=world", "gmail", "com"]);
    });

    it("should reject invalid input: missing username", () => {
      const input = "@protonmail.com";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it("should reject invalid input: username contains invalid character #", () => {
      const input = "shigoto#@protonmail.com";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it("should reject invalid input: username contains invalid character +", () => {
      const input = "shigoto+@protonmail.com";
      testZkRegex(emailRegex, input, Bool(false));
    });
  });

  describe('symbol', () => {
    it('should accept valid input: symbol=@', () =>{
      const input = "hello@world.com";
      testZkRegex(emailRegex, input, Bool(true));
    });

    it('should reject invalid input: missing symbol', () =>{
      const input = "helloworld.com";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it('should reject invalid input: symbol=#', () =>{
      const input = "hello#world.com";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it('should reject invalid input: symbol=+', () =>{
      const input = "hello+world.com";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it('should reject invalid input: symbol=!', () =>{
      const input = "hello!world.com";
      testZkRegex(emailRegex, input, Bool(false));
    });
  });

  describe('mail server', () => {
    it("should accept valid input: mail server is alphabetic", () => {
      const input = "hello@CoolWorld.com";
      testZkRegex(emailRegex, input, Bool(true), ["hello", "CoolWorld", "com"]);
    });

    it("should accept valid input: mail server is alphabetic lowercase", () => {
      const input = "ninja@gaiden.xyz";
      testZkRegex(emailRegex, input, Bool(true), ["ninja", "gaiden", "xyz"]);
    });

    it("should accept valid input: mail server is alphabetic uppercase", () => {
      const input = "CONSTANT@INPUT.output";
      testZkRegex(emailRegex, input, Bool(true));
    });
  
    it("should accept valid input: mail server is alphanumeric", () => {
      const input = "Trojan@Horse7.com";
      testZkRegex(emailRegex, input, Bool(true));
    });
  
    it("should accept valid input: mail server is numeric", () => {
      const input = "spy@007.com";
      testZkRegex(emailRegex, input, Bool(true));
    });

    it("should accept valid input: mail server contains -", () => {
      const input = "hello@cool-world.com";
      testZkRegex(emailRegex, input, Bool(true));
    });

    it("should reject invalid input: missing mail server", () => {
      const input = "shigoto-dev19@.com";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it("should reject invalid input: mail server contains invalid character %", () => {
      const input = "hello@meine%liebe.com";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it("should reject invalid input: mail server contains invalid character _", () => {
      const input = "shigoto-dev19@proton_mail.com";
      testZkRegex(emailRegex, input, Bool(false));
    });
  
    it("should reject invalid input: mail server contains invalid character =", () => {
      const input = "hello@sevgili=dunya.com";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it("should reject invalid input: mail server contains invalid character #", () => {
      const input = "shigoto@proto#nmail.com";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it("should reject invalid input: mail server contains invalid character +", () => {
      const input = "shigoto@proton+mail.com";
      testZkRegex(emailRegex, input, Bool(false));
    });
  });

  describe('domain', () => {
    it("should accept valid input: domain is alphabetic lowercase", () => {
      const input = "hey@there.buddy";
      testZkRegex(emailRegex, input, Bool(true), ["hey", "there", "buddy"]);
    });

    it("should reject invalid input: missing .", () => {
      const input = "shigoto-dev19@com";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it("should reject invalid input: missing domain", () => {
      const input = "shigoto-dev19@.";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it("should reject invalid input: domain is alphabetic uppercase", () => {
      const input = "hola@atodos.COM";
      testZkRegex(emailRegex, input, Bool(false));
    });
  
    it("should reject invalid input: domain is alphanumeric", () => {
      const input = "Trojan@Horse7.6com";
      testZkRegex(emailRegex, input, Bool(false));
    });
  
    it("should reject invalid input: domain is numeric", () => {
      const input = "spy@007.123";
      testZkRegex(emailRegex, input, Bool(false));
    });
    
    it("should reject invalid input: domain contains invalid character $", () => {
      const input = "hello@beautiful.WORLD.$com";
      testZkRegex(emailRegex, input, Bool(false));
    });

    it("should reject invalid input: domain contains invalid character %", () => {
      const input = "hello@meine%liebe.com%";
      testZkRegex(emailRegex, input, Bool(false));
    });
  });
});

// ([a-zA-Z0-9]|\\+|/|=)+
describe("Base64 Regex: '([a-zA-Z0-9]|\\+|/|=)+'", () => {
  it("should accept valid input: alphabetic lowercase", () => {
    const input = "jkjasldfjlskdf";
    testZkRegex(base64Regex, input, Field(input.length), [input]);
  });

  it("should accept valid input: alphabetic uppercase", () => {
    const input = "KDSFASDFSD";
    testZkRegex(base64Regex, input, Field(input.length), [input]);
  });

  it("should accept valid input: alphabetic", () => {
    const input = "dfsADAFSksFD";
    testZkRegex(base64Regex, input, Field(input.length), [input]);
  });

  it("should accept valid input: numeric", () => {
    const input = "8928343242";
    testZkRegex(base64Regex, input, Field(input.length), [input]);
  });

  it("should accept valid input: alphanumeric", () => {
    const input = "sdfAE23dFAc";
    testZkRegex(base64Regex, input, Field(input.length), [input]);
  });

  it("should accept valid input: alphanumeric with + character", () => {
    const input = "12Qsa+SDFsds";
    testZkRegex(base64Regex, input, Field(input.length), [input]);
  });

  it("should accept valid input: alphanumeric with / character", () => {
    const input = "Ad234dfED/sdfaZ";
    testZkRegex(base64Regex, input, Field(input.length), [input]);
  });

  it("should accept valid input: alphanumeric with = character", () => {
    const input = "ywZJU124=jsfd3";
    testZkRegex(base64Regex, input, Field(input.length), [input]);
  });

  it("should accept valid BASE64 input: case1", () => {
    const input = "M/Dsdf=QW+pD";
    testZkRegex(base64Regex, input, Field(input.length), [input]);
  });

  it("should accept valid BASE64 input: case2", () => {
    const input = "F/zND+U2Nzg5MA==";
    testZkRegex(base64Regex, input, Field(input.length), [input]);
  });

  it("should accept valid BASE64 input: case3", () => {
    const input = "5p2x5aW95YiW44Gv44CB44GC=/=+/+";
    testZkRegex(base64Regex, input, Field(input.length), [input]);
  });

  it("should reject invalid input: invalid character .", () => {
    const input = "shigotoDev.12D";
    testZkRegex(base64Regex, input, Field(input.length - 1), ["shigotoDev12D"]);
  });

  it("should reject invalid input: invalid character $", () => {
    const input = "59$FORpay2MEnt=";
    testZkRegex(base64Regex, input, Field(input.length - 1), ["59FORpay2MEnt="]);
  });

  it("should reject invalid input: invalid character >", () => {
    const input = "sZW23sf=>s12/";
    testZkRegex(base64Regex, input, Field(input.length - 1), ["sZW23sf=s12/"]);
  });

  it("should reject invalid input: invalid character #", () => {
    const input = "1AQX=/EWS#p94";
    testZkRegex(base64Regex, input, Field(input.length - 1), ["1AQX=/EWSp94"]);
  });
});

// (mina|MINA)+
// This example demonstrates how zk-regex counts occurrences of patterns.
describe("Mina Regex: '(mina|MINA)+", () => {
  it("should find occurence of 1 'mina' pattern: case 1", () => {
    const input = "mina";
    testZkRegex(minaRegex, input, Field(1), [input, ""]);
  });

  it("should find occurence of 1 'mina' pattern: case 2", () => {
    const input = "stamina";
    testZkRegex(minaRegex, input, Field(1), ["mina", ""]);
  });

  it("should find occurence of 1 'mina' pattern: case 3", () => {
    const input = "The terminal station is nearby";
    testZkRegex(minaRegex, input, Field(1), ["mina", ""]);
  });

  it("should find occurence of 2 'mina' patterns: case 1", () => {
    const input = "I need stamina to reach the faraway terminal";
    testZkRegex(minaRegex, input, Field(2), ["minamina", ""]);
  });

  it("should find occurence of 2 'mina' patterns: case 2", () => {
    const input = "Amina is dominating the tournament";
    testZkRegex(minaRegex, input, Field(2), ["minamina", ""]);
  });

  it("should find occurence of 3 'mina' patterns", () => {
    const input = "Amina is dominating the tournament with her stamina";
    testZkRegex(minaRegex, input, Field(3), ["minaminamina", ""]);
  });

  it("should find occurence of 1 'MINA' pattern: case 1", () => {
    const input = "MINA is a succint blockchain";
    testZkRegex(minaRegex, input, Field(1), ["", "MINA"]);
  });

  it("should find total occurence of 2 'MINA' or 'mina' pattern", () => {
    const input = "Is MINA minable?";
    testZkRegex(minaRegex, input, Field(2), ["mina", "MINA"]);
  });

  it("should find total occurence of 3 'MINA' or 'mina' pattern", () => {
    const input = "MINAminaMINA";
    testZkRegex(minaRegex, input, Field(3), ["mina", "MINAMINA"]);
  });

  it("should find total occurence of 4 'MINA' or 'mina' pattern", () => {
    const input = "Be luminary and illuminate, don't discriminate or eliminate";
    testZkRegex(minaRegex, input, Field(4), ["mina".repeat(4), ""]);
  });

  it("should find no valid pattern: case 1", () => {
    const input = "Mina is a western name!";
    testZkRegex(minaRegex, input, Field(0));
  });

  it("should find no valid pattern: case 2", () => {
    const input = "lol";
    testZkRegex(minaRegex, input, Field(0));
  });

  it("should find no valid pattern: case 3", () => {
    const input = "MiNa doesn't count!";
    testZkRegex(minaRegex, input, Field(0));
  });

  it("should find no valid pattern: case 4", () => {
    const input = "The word miniature is close enough";
    testZkRegex(minaRegex, input, Field(0));
  });

  it("should find no valid pattern: case 5", () => {
    //! "" is error prone when reveal is enabled
    const input = " ";
    testZkRegex(minaRegex, input, Field(0));
  });
});

// a:[^abcdefghijklmnopqrstuvwxyz]+.
describe("Negate Regex: 'a:[^abcdefghijklmnopqrstuvwxyz]+.'", () => {
  it("should accept valid input: English", () => {
    const input = "a: HELLO THERE.";
    const revealedSubstring = " HELLO THERE";
    testZkRegex(negateRegex, input, Bool(true), [revealedSubstring]);
  });

  it("should accept valid input: spanish", () => {
    // Spanish character "í" has 2 bytes.
    const input = "a: CRIPTOGRAFíA.";
    const revealedSubstring = " CRIPTOGRAFíA";
    testZkRegex(negateRegex, input, Bool(true), [revealedSubstring]);
  });

  it("should accept valid input: japanese", () => {
    // Each Japanese character has 3 bytes.
    const input = "a: あいう.";
    const revealedSubstring = " あいう";
    testZkRegex(negateRegex, input, Bool(true), [revealedSubstring]);
  });

  it("should accept valid input: arabic", () => {
    /// Arabian character "التشفير" has 14 bytes.
    const input = "a: التشفير.";
    const revealedSubstring = " التشفير";
    testZkRegex(negateRegex, input, Bool(true), [revealedSubstring]);
  });

  it("should accept valid input: contains ?#%", () => {
    const input = "a: HA?SH#ING%.";
    const revealedSubstring = " HA?SH#ING%";
    testZkRegex(negateRegex, input, Bool(true), [revealedSubstring]);
  });

  it("should not accept invalid input: 'a' missing", () => {
    const input = "b: ADSFS.";
    testZkRegex(negateRegex, input, Bool(false));
  });

  it("should not accept invalid input: ':' mssing", () => {
    const input = "a CRYPTO.";
    testZkRegex(negateRegex, input, Bool(false));
  });

  it("should not accept invalid input: missing '.' at the end", () => {
    const input = "a: FROG";
    testZkRegex(negateRegex, input, Bool(false));
  });

  it("should not accept invalid input: all lowercase", () => {
    const input = "a: cryptage.";
    testZkRegex(negateRegex, input, Bool(false));
  });

  it("should not accept invalid input: contains lowercase", () => {
    const input = "a: CryptoGraphy.";
    testZkRegex(negateRegex, input, Bool(false));
  });
});

// [^aeiou]+
describe("Negate Vowels: '[^aeiou]+'", () => {
  it("should not accept a word that contains character 'a'", () => {
    testZkRegex(negateVowel, "flag", Bool(false), ["flg"]);
  });

  it("should not accept a word that contains character 'e'", () => {
    testZkRegex(negateVowel, "fee", Bool(false), ["f"]);
  });

  it("should not accept character i", () => {
    testZkRegex(negateVowel, "init", Bool(false), ["nt"]);
  });

  it("should not accept character o", () => {
    testZkRegex(negateVowel, "oooh!", Bool(false), ["h!"]);
  });

  it("should not accept a word that contains character 'u'", () => {
    testZkRegex(negateVowel, "turf", Bool(false), ["trf"]);
  });

  it("should accept word without vowels", () => {
    const input = "grr";
    testZkRegex(negateVowel, input, Bool(true), [input]);
  });

  it("should accept word with numbers", () => {
    const input = "12345 678";
    testZkRegex(negateVowel, input, Bool(true), [input]);
  });

  it("should not accept word containing only vowels", () => {
    testZkRegex(negateVowel, "aeiouaaoouii", Bool(false), ['']);
  });
});