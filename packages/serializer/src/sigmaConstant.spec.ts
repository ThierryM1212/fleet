import { ensureBigInt } from "@fleet-sdk/common";
import { hex, randomBytes } from "@fleet-sdk/crypto";
import { describe, expect, it, test } from "vitest";
import {
  bigintVectors,
  boolVectors,
  byteVectors,
  collVectors,
  groupElementVectors,
  intVectors,
  longVectors,
  shortVectors,
  sigmaPropVectors,
  tupleTestVectors
} from "./_test-vectors/constantVectors";
import { SigmaWriter } from "./coders";
import { DataSerializer } from "./serializers";
import { parse, SConstant } from "./sigmaConstant";
import { SGroupElementType } from "./types";
import {
  SBigInt,
  SBool,
  SByte,
  SColl,
  SGroupElement,
  SInt,
  SLong,
  SShort,
  SSigmaProp,
  SUnit
} from "./types/";
import { STuple } from "./types/constructors";

describe("Primitive types serialization and parsing", () => {
  it.each(boolVectors)("Should road-trip SBool($value)", (tv) => {
    expect(SBool(tv.value).toHex()).to.be.equal(tv.hex);
    expect(SConstant.from(tv.hex).data).to.be.equal(tv.value);
  });

  it.each(byteVectors)("Should road-trip SByte($value)", (tv) => {
    expect(SByte(tv.value).toHex()).to.be.equal(tv.hex);
    expect(SConstant.from(tv.hex).data).to.be.equal(tv.value);
  });

  it.each(shortVectors)("Should road-trip SShort($value)", (tv) => {
    expect(SShort(tv.value).toHex()).to.be.equal(tv.hex);
    expect(SConstant.from(tv.hex).data).to.be.equal(tv.value);
  });

  it.each(intVectors)("Should road-trip SInt($value)", (tv) => {
    expect(SInt(tv.value).toHex()).to.be.equal(tv.hex);
    expect(SConstant.from(tv.hex).data).to.be.equal(tv.value);
  });

  it.each(longVectors)("Should road-trip SLong($value)", (tv) => {
    expect(SLong(tv.value).toHex()).to.be.equal(tv.hex);
    expect(SLong(String(tv.value)).toHex()).to.be.equal(tv.hex);

    expect(SConstant.from(tv.hex).data).to.be.equal(ensureBigInt(tv.value));
  });

  it.each(longVectors)("Should road-trip SLong($value)", (tv) => {
    expect(SLong(tv.value).toHex()).to.be.equal(tv.hex);
    expect(SLong(String(tv.value)).toHex()).to.be.equal(tv.hex);

    expect(SConstant.from(tv.hex).data).to.be.equal(ensureBigInt(tv.value));
  });

  it.each(groupElementVectors)("Should road-trip SGroupElement($value)", (tv) => {
    expect(SGroupElement(tv.value).toHex()).to.be.equal(tv.hex);
    expect(SGroupElement(hex.decode(tv.value)).toHex()).to.be.equal(tv.hex);

    expect(SConstant.from(tv.hex).data).to.be.deep.equal(hex.decode(tv.value));
  });

  it.each(sigmaPropVectors)("Should road-trip SSigmaProp(ProveDlog($value))", (tv) => {
    expect(SSigmaProp(SGroupElement(tv.value)).toHex()).to.be.equal(tv.hex);
    expect(SSigmaProp(SGroupElement(hex.decode(tv.value))).toHex()).to.be.equal(tv.hex);

    expect(SConstant.from(tv.hex).data).to.be.deep.equal(hex.decode(tv.value));
  });

  it.each(bigintVectors)("Should road-trip SBigInt($value)", (tv) => {
    expect(SBigInt(tv.value).toHex()).to.be.equal(tv.hex);
    expect(SBigInt(BigInt(tv.value)).toHex()).to.be.equal(tv.hex);

    expect(SConstant.from(tv.hex).data).to.be.equal(BigInt(tv.value));
  });

  it("Should coerce alternative input types", () => {
    const expectedBytes = Uint8Array.from([0xde, 0xad, 0xbe, 0xef]);

    expect(SGroupElement("deadbeef").data).to.be.deep.equal(expectedBytes);
    expect(SLong("1").data).to.be.deep.equal(1n);
    expect(SBigInt("123").data).to.be.deep.equal(123n);
  });
});

describe("Monomorphic types serialization and parsing", () => {
  it("Should serialize SUnit", () => {
    const sUnitHex = "62";
    expect(SUnit().toHex()).toBe(sUnitHex);
    expect(SConstant.from(sUnitHex).data).to.be.undefined;
  });
});

describe("SColl serialization and parsing", () => {
  it.each(collVectors)("Should serialize $name", (tv) => {
    expect(tv.sconst.toHex()).to.be.equal(tv.hex);
    expect(SConstant.from(tv.hex).data).to.be.deep.equal(tv.value);
  });

  it("Should coerce alternative input types", () => {
    const expectedBytes = Uint8Array.from([0xde, 0xad, 0xbe, 0xef]);
    expect(SColl(SByte, "deadbeef").data).to.be.deep.equal(expectedBytes);
    expect(SColl(SByte, [222, 173, 190, 239]).data).to.be.deep.equal(expectedBytes);
    expect(SColl(SByte, Uint8Array.from([0xde, 0xad, 0xbe, 0xef])).data).to.be.deep.equal(
      expectedBytes
    );

    expect(SColl(SGroupElement, ["deadbeef"]).data).to.be.deep.equal([expectedBytes]);
    expect(SColl(SLong, ["1", 2n]).data).to.be.deep.equal([1n, 2n]);
    expect(SColl(SBigInt, ["1", 2n]).data).to.be.deep.equal([1n, 2n]);
  });
});

describe("Data only parsing", () => {
  it("Should parse only data", () => {
    expect(parse("40050002")).to.deep.equal([0, 1n]);
    expect(parse("0101")).to.deep.equal(true);
  });

  it("Should throw with invalid bytes in 'strict' parsing mode", () => {
    expect(() => parse("deadbeef")).to.throw();
    expect(() => parse("deadbeef", "strict")).to.throw();
  });

  it("Should not throw but return undefined with invalid bytes in 'safe' parsing mode", () => {
    expect(() => parse("deadbeef", "safe")).not.to.throw();
    expect(parse("deadbeef", "safe")).to.be.undefined;
    expect(parse(undefined as unknown as string, "safe")).to.be.undefined;
    expect(parse("0102", "safe")).to.be.equal(false);
  });
});

describe("Not implemented types", () => {
  it("Should fail while trying to serialize a not implemented type", () => {
    const unimplementedType = {
      code: 0x64, // AvlTree type code
      embeddable: false,
      coerce: (val: unknown) => val
    } as unknown as SGroupElementType;

    expect(() => {
      new SConstant(unimplementedType, "").toBytes();
    }).to.throw("Serialization error: type not implemented.");

    // not implemented SSigmaProp expression
    expect(() => {
      SSigmaProp(new SConstant(unimplementedType, Uint8Array.from([0]))).toBytes();
    }).to.throw("Serialization error: SigmaProp operation not implemented.");

    // not implemented SSigmaProp expression
    expect(() => {
      DataSerializer.serialize("", unimplementedType, new SigmaWriter(1));
    }).to.throw("Serialization error: '0x64' type not implemented.");
  });

  it("Should fail while trying to deserialize a not implemented SigmaProp expression", () => {
    expect(() => {
      SConstant.from("08ce");
    }).to.throw();
  });

  it("Should fail while trying to deserialize a not implemented type", () => {
    expect(() => {
      SConstant.from("deadbeef");
    }).to.throw();
  });
});

describe("Tuple serialization", () => {
  it.each(tupleTestVectors)("Should road-trip $name", (tv) => {
    expect(tv.sconst.toHex()).to.be.equal(tv.hex);
    expect(SConstant.from(tv.hex).data).to.be.deep.equal(tv.value);
  });

  it("Should road trip", () => {
    // quadruple
    expect(
      SConstant.from(
        STuple(SColl(SBool, [true, false, true]), SBigInt(10n), SBool(false), SShort(2)).toHex()
      ).data
    ).to.be.deep.equal([[true, false, true], 10n, false, 2]);

    // generic tuple with 4+ items
    expect(
      SConstant.from(
        STuple(SBool(false), SBigInt(10n), SBool(false), SShort(2), SLong(1232n)).toHex()
      ).data
    ).to.be.deep.equal([false, 10n, false, 2, 1232n]);
    expect(
      SConstant.from(STuple(SInt(1), SInt(2), SInt(3), SInt(2), SInt(4), SInt(5), SInt(6)).toHex())
        .data
    ).to.be.deep.equal([1, 2, 3, 2, 4, 5, 6]);
  });

  it("Should fail with tuples with items out of the 2 - 255 range", () => {
    expect(() => STuple(SInt(1)).toHex()).to.throw(
      "Invalid type: tuples must have between 2 and 255 items."
    );

    const _256Items = STuple(...Array.from({ length: 256 }, (_, i) => SShort(i)));
    expect(() => _256Items.toHex()).to.throw(
      "Invalid type: tuples must have between 2 and 255 items."
    );
  });
});

describe("Positive fuzzy tests", () => {
  function randomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function getRandomBigInt(bytes: number) {
    return BigInt(`0x${hex.encode(randomBytes(bytes))}`);
  }

  function randomBigInt(min: bigint, max: bigint) {
    // increase the chances of negative numbers generation;
    const rand = getRandomBigInt(1) % 2n === 0n ? getRandomBigInt(1) : getRandomBigInt(1) * -1n;

    return (rand * (max - min + 1n) + min) / 10_000n;
  }

  // https://docs.scala-lang.org/overviews/scala-book/built-in-types.html

  test("SByte fuzzing", () => {
    for (let i = 0; i < 100; i++) {
      const value = randomInt(0, 127);
      expect(SConstant.from(SByte(value).toHex()).data).toBe(value);
    }
  });

  test("SShort fuzzing", () => {
    for (let i = 0; i < 100; i++) {
      const value = randomInt(-32_768, 32_767);
      expect(SConstant.from(SShort(value).toHex()).data).toBe(value);
    }
  });

  test("SInt fuzzing", () => {
    for (let i = 0; i < 100; i++) {
      const value = randomInt(-2_147_483_648, 2_147_483_647);
      expect(SConstant.from(SInt(value).toHex()).data).toBe(value);
    }
  });

  test("SLong fuzzing", () => {
    for (let i = 0; i < 100; i++) {
      const value = randomBigInt(-9_223_372_036_854_775_808n, 9_223_372_036_854_775_807n);
      expect(SConstant.from(SLong(value).toHex()).data).toBe(value);
    }
  });

  test("SBigInt fuzzing", () => {
    for (let i = 0; i < 1000; i++) {
      const value = randomBigInt(-9_223_372_036_854_775_808_000n, 9_223_372_036_854_775_807_000n);
      expect(SConstant.from(SBigInt(value).toHex()).data).toBe(value);
    }
  });
});
