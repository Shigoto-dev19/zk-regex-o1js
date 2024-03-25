//TODO Add MINA string regex test example

import { Field } from 'o1js';
import { emailRegex, simpleRegex } from './examples';

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

// 1=(a|b) (2=(b|c)+ )+d
describe("Simple Regex", () => {
  it("should accept valid input: case 1", async () => {
    const input = "1=a 2=b d";
    const paddedStr = padString(input, 64);

    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(1));
  });

  it("should accept valid input: case 2", async () => {
    const input = "1=a 2=b 2=bc 2=c d";
    const paddedStr = padString(input, 64);
   
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(1));
  });

  it("should accept valid input: case 3", async () => {
    const input = "1=b 2=c d";
    const paddedStr = padString(input, 64);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(1));
  });

  it("should accept valid input: case 4", async () => {
    const input = "1=a 2=b d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(1));
  });

  it("should accept valid input: case 5", async () => {
    const input = "1=b 2=bbccccc d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(1));
  });

  it("should accept valid input: case 6", async () => {
    const input = "1=b 2=c d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(1));
  });

  it("should accept valid input: case 7", async () => {
    const input = "1=b 2=bbccccc d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(1));
  });

  it("should reject invalid input: case 1: missing required part '1='", async () => {
    const input = "2=bc";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(0))
  });

  it("should reject invalid input: case 2: missing required part '2='", async () => {
    const input = "1=a";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(0))
  });

  it("should reject invalid input: case 3: missing required final character 'd'", async () => {
    const input = "1=a 2=bbbccc";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(0))
  });

  it("should reject invalid input: case 4: invalid character 'j' after '1='", async () => {
    const input = "1=j 2=bbcc d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(0))
  });

  it("should reject invalid input: case 5: final character 'd' is attched to '2='", async () => {
    const input = "1=a 2=bd";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(0))
  });

  it("should reject invalid input: case 6: invalid character 'k' after '2='", async () => {
    const input = "1=a 2=ck";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(0))
  });

  it("should reject invalid input: case 7: missing required character 'b' or 'c' after '2='", async () => {
    const input = "1=a 2=fl";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(0))
  });

  it("should reject invalid input: case 8: invalid character 'f' after many characters 'c' after '2='", async () => {
    const input = "1=a 2=bbcccf d";
    const paddedStr = padString(input);
    
    const isValid = simpleRegex(paddedStr);
    expect(isValid).toEqual(Field(0))
  });
});

// ([a-zA-Z0-9._%-=]+@[a-zA-Z0-9.-]+.[a-z])
describe("Email Regex", () => {
  describe('username', () => {
    it("should accept valid input: username is alphabetic", () => {
      const input = "marcoPollo@expertcodebolg.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it("should accept valid input: username is alphabetic lowercase", () => {
      const input = "mina@blockchain.xyz";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it("should accept valid input: username is alphabetic uppercase", () => {
      const input = "CONSTANT@input.zk";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });
  
    it("should accept valid input: username is alphanumeric", () => {
      const input = "halo2Spartian@hotmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });
  
    it("should accept valid input: username is numeric", () => {
      const input = "007@spy.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });
    
    it("should accept valid input: username contains .", () => {
      const input = "hello.world@gmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it("should accept valid input: username contains _", () => {
      const input = "hello_world@gmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it("should accept valid input: username contains %", () => {
      const input = "hello%world@gmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it("should accept valid input: username contains -", () => {
      const input = "shigoto-dev19@protonmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });
  
    it("should accept valid input: username contains =", () => {
      const input = "hello=world@gmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it("should reject invalid input: missing username", () => {
      const input = "@protonmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0))
    });

    it("should reject invalid input: username contains invalid character #", () => {
      const input = "shigoto#@protonmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0))
    });

    it("should reject invalid input: username contains invalid character +", () => {
      const input = "shigoto+@protonmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0))
    });
  });

  describe('symbol', () => {
    it('should accept valid input: symbol=@', () =>{
      const input = "hello@world.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it('should reject invalid input: missing symbol', () =>{
      const input = "helloworld.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });

    it('should reject invalid input: symbol=#', () =>{
      const input = "hello#world.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });

    it('should reject invalid input: symbol=+', () =>{
      const input = "hello+world.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });

    it('should reject invalid input: symbol=!', () =>{
      const input = "hello!world.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });
  });

  describe('mail server', () => {
    it("should accept valid input: domain is alphabetic", () => {
      const input = "hello@CoolWorld.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it("should accept valid input: domain is alphabetic lowercase", () => {
      const input = "ninja@gaiden.xyz";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it("should accept valid input: domain is alphabetic uppercase", () => {
      const input = "CONSTANT@INPUT.output";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });
  
    it("should accept valid input: domain is alphanumeric", () => {
      const input = "Trojan@Horse7.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });
  
    it("should accept valid input: domain is numeric", () => {
      const input = "spy@007.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });
    
    it("should accept valid input: domain contains .", () => {
      const input = "hello@beautiful.WORLD.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it("should accept valid input: domain contains -", () => {
      const input = "hello@cool-world.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it("should reject invalid input: missing mail server", () => {
      const input = "shigoto-dev19@.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0))
    });

    it("should reject invalid input: domain contains invalid character %", () => {
      const input = "hello@meine%liebe.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });

    it("should reject invalid input: domain contains invalid character _", () => {
      const input = "shigoto-dev19@proton_mail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });
  
    it("should reject invalid input: domain contains invalid character =", () => {
      const input = "hello@sevgili=dunya.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });

    it("should reject invalid input: domain contains invalid character #", () => {
      const input = "shigoto@proto#nmail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0))
    });

    it("should reject invalid input: domain contains invalid character +", () => {
      const input = "shigoto@proton+mail.com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0))
    });
  });

  describe('domain', () => {
    it("should accept valid input: domain is alphabetic lowercase", () => {
      const input = "hey@there.buddy";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(1));
    });

    it("should reject invalid input: missing .", () => {
      const input = "shigoto-dev19@com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0))
    });

    it("should reject invalid input: missing domain", () => {
      const input = "shigoto-dev19@.";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0))
    });

    it("should reject invalid input: domain is alphabetic uppercase", () => {
      const input = "hola@atodos.COM";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });
  
    it("should reject invalid input: domain is alphanumeric", () => {
      const input = "Trojan@Horse7.6com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });
  
    it("should reject invalid input: domain is numeric", () => {
      const input = "spy@007.123";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });
    
    it("should reject invalid input: domain contains invalid character $", () => {
      const input = "hello@beautiful.WORLD.$com";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });

    it("should reject invalid input: domain contains invalid character %", () => {
      const input = "hello@meine%liebe.com%";
      const paddedStr = padString(input);
      
      const isValid = emailRegex(paddedStr);
      expect(isValid).toEqual(Field(0));
    });
  });
});