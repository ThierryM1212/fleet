import { decimalize, ensureBigInt, sumBy, undecimalize } from "./bigIntUtils";

describe("decimalize()", () => {
  it("Should decimalize", () => {
    expect(decimalize(1763874n)).toBe("1763874");
    expect(decimalize(1763874n, { decimals: 2 })).toBe("17638.74");
    expect(decimalize(1763874n, 2)).toBe("17638.74");
    expect(decimalize(1874n, { decimals: 10 })).toBe("0.0000001874");
    expect(decimalize(1874n, 10)).toBe("0.0000001874");
    expect(decimalize(1n, { decimals: 2 })).toBe("0.01");
    expect(decimalize(1n, 2)).toBe("0.01");
    expect(decimalize(1298379183n)).toBe("1298379183");
  });

  it("Should format", () => {
    expect(
      decimalize(129837918300001n, {
        decimals: 5,
        thousandMark: ",",
        decimalMark: "."
      })
    ).toBe("1,298,379,183.00001");

    expect(
      decimalize(129837918300001n, {
        decimals: 5
      })
    ).toBe("1298379183.00001");

    expect(
      decimalize(129837918300001n, {
        decimals: 5,
        thousandMark: ".",
        decimalMark: ","
      })
    ).toBe("1.298.379.183,00001");

    expect(
      decimalize(129837918300001n, {
        decimals: 5,
        thousandMark: "#",
        decimalMark: "-"
      })
    ).toBe("1#298#379#183-00001");

    expect(
      decimalize("129837918300001", {
        decimals: 0,
        thousandMark: "#"
      })
    ).toBe("129#837#918#300#001");

    expect(decimalize("1100000", { decimals: 9 })).toBe("0.0011");
    expect(decimalize(129837918300n, { decimals: 9 })).toBe("129.8379183");
    expect(decimalize(100n, { decimals: 2 })).toBe("1");
    expect(decimalize(123n, { decimals: 2 })).toBe("1.23");
    expect(decimalize(1n, { decimals: 2 })).toBe("0.01");
    expect(decimalize(1298379183n)).toBe("1298379183");
  });

  it("Should do a roundtrip", () => {
    const options = { decimals: 9 };
    expect(decimalize(undecimalize("129.8379183", options), options)).toBe("129.8379183");
  });
});

describe("undecimalize()", () => {
  it("Should parse BigInt strings", () => {
    expect(undecimalize(" ")).toBe(0n);
    expect(undecimalize("")).toBe(0n);
    expect(undecimalize("", { decimals: 9 })).toBe(0n);
    expect(undecimalize("", 9)).toBe(0n);
    expect(undecimalize("0.0011", { decimals: 9 })).toBe(1100000n);
    expect(undecimalize("0.0011", 9)).toBe(1100000n);
    expect(undecimalize("129.8379183", { decimals: 9 })).toBe(129837918300n);
    expect(undecimalize("129.8379183", 9)).toBe(129837918300n);
    expect(undecimalize("1", { decimals: 2 })).toBe(100n);
    expect(undecimalize("1", 2)).toBe(100n);
    expect(undecimalize("1.23", { decimals: 2 })).toBe(123n);
    expect(undecimalize("1.23", 2)).toBe(123n);
    expect(undecimalize("123", { decimals: 2 })).toBe(12300n);
    expect(undecimalize("123", 2)).toBe(12300n);
    expect(undecimalize("1.233", { decimals: 2 })).toBe(1233n);
    expect(undecimalize("1.233", 2)).toBe(1233n);
    expect(undecimalize("1.23")).toBe(123n);
    expect(undecimalize("1")).toBe(1n);
    expect(undecimalize("1", { decimals: 0 })).toBe(1n);
    expect(undecimalize("1", 0)).toBe(1n);
    expect(undecimalize("0,0011", { decimals: 9, decimalMark: "," })).toBe(1100000n);
    expect(undecimalize("129-8379183", { decimals: 9, decimalMark: "-" })).toBe(129837918300n);

    expect(undecimalize("-129.8379183", { decimals: 9 })).toBe(-129837918300n);
    expect(undecimalize("-129.8379183", 9)).toBe(-129837918300n);
    expect(undecimalize("-129.8379183")).toBe(-1298379183n);
  });

  it("Should throw if used with wrong number format", () => {
    expect(() => {
      undecimalize("12.23.1");
    }).toThrow();
  });
});

describe("ensureBigInt()", () => {
  it("Should convert arbitrary types to bigint", () => {
    expect(ensureBigInt("1298379183")).toBe(1298379183n);
    expect(ensureBigInt(10)).toBe(10n);
    expect(ensureBigInt(true)).toBe(1n);
  });

  it("Should bypass conversion when using an bigint as argument", () => {
    expect(ensureBigInt(1298379183n)).toBe(1298379183n);
  });
});

describe("BigInt sumBy()", () => {
  const values = [
    { key: 1, value: 10n },
    { key: 2, value: 12313n },
    { key: 3, value: 45n },
    { key: 4, value: 435345n },
    { key: 5, value: 3545n },
    { key: 6, value: 659n },
    { key: 7, value: 9558n }
  ];

  it("Should sum filled array", () => {
    expect(sumBy(values, (x) => x.value)).toBe(461475n);
  });

  it("Should return zero if the array is empty", () => {
    const values: { value: bigint }[] = [];

    expect(sumBy(values, (x) => x.value)).toBe(0n);
  });

  it("Should sum conditionally", () => {
    expect(
      sumBy(
        values,
        (x) => x.value,
        (x) => x.key > 0
      )
    ).toBe(461475n);

    expect(
      sumBy(
        values,
        (x) => x.value,
        (x) => x.key < 0
      )
    ).toBe(0n);

    expect(
      sumBy(
        values,
        (x) => x.value,
        (x) => x.key % 2 === 0
      )
    ).toBe(448317n);

    expect(
      sumBy(
        values,
        (x) => x.value,
        (x) => x.key % 2 !== 0
      )
    ).toBe(13158n);
  });
});
