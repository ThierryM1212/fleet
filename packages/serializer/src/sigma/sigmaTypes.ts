import { ensureBigInt, isDefined } from "@fleet-sdk/common";
import { hex } from "@fleet-sdk/crypto";
import { DataSerializer } from "./dataSerializer";
import { SigmaReader } from "./sigmaReader";
import { SigmaWriter } from "./sigmaWriter";
import { TypeSerializer } from "./typeSerializer";

export const constructorCode = Object.freeze({
  embeddable: 0,

  simpleColl: 1,
  nestedColl: 2,

  option: 3,
  optionCollection: 4,

  pairOne: 5,
  pairTwo: 6,
  symmetricPair: 7,
  genericTuple: 8
});

const MAX_PRIMITIVE_TYPE_CODE = 0x0b;
export const PRIMITIVE_TYPE_RANGE = MAX_PRIMITIVE_TYPE_CODE + 0x01;
const typeCodeOf = (constructor: number) => PRIMITIVE_TYPE_RANGE * constructor;

export abstract class SType {
  abstract get code(): number;
  abstract get embeddable(): boolean;
}

export class SPrimitiveType<I, O = I> implements SType {
  private readonly _code: number;
  private readonly _coercionFn: (value: I) => O;

  constructor(code: number, coercion: (value: I) => O) {
    this._code = code;
    this._coercionFn = coercion;
  }

  get code() {
    return this._code;
  }

  get embeddable(): boolean {
    return true;
  }

  coerce(value: I): O {
    return this._coercionFn(value);
  }
}

export class SMonomorphicType<I, O = I> implements SType {
  private readonly _code: number;
  private readonly _coercionFn: (value: I) => O;

  constructor(code: number, coercion: (value: I) => O) {
    this._code = code;
    this._coercionFn = coercion;
  }

  get code() {
    return this._code;
  }

  get embeddable(): boolean {
    return false;
  }

  coerce(value: I): O {
    return this._coercionFn(value);
  }
}

export abstract class SGenericType<T extends SType> implements SType {
  abstract get code(): number;
  abstract get elementsType(): T | T[];

  get embeddable(): boolean {
    return false;
  }
}

export class SCollType<T extends SType = SType> extends SGenericType<T> {
  private readonly _internalType: T;

  constructor(type: T) {
    super();
    this._internalType = type;
  }

  get code(): number {
    return sDescriptors.coll.code;
  }

  get elementsType(): T {
    return this._internalType;
  }
}

export class STupleType<T extends SType = SType> extends SGenericType<T> {
  private readonly _internalType: T[];

  constructor(type: T[]) {
    super();
    this._internalType = type;
  }

  get code(): number {
    return sDescriptors.tuple.code;
  }

  get elementsType(): T[] {
    return this._internalType;
  }
}

export interface ISigmaTypeBase {
  readonly code: number;

  readonly embeddable: boolean;
  readonly primitive: boolean;
}

type BigIntInput = number | string | bigint;
type ByteInput = Uint8Array | string;

const noCoercion = <T>(input: T) => input;
const ensureBytes = (input: ByteInput) => (typeof input === "string" ? hex.decode(input) : input);

export function isColl(type: SType): type is SCollType {
  return (
    type.code >= sDescriptors.coll.simpleCollTypeCode &&
    type.code <= sDescriptors.coll.nestedCollTypeCode + MAX_PRIMITIVE_TYPE_CODE
  );
}

export function isTuple(type: SType): type is STupleType<SType> {
  return (
    type.code >= sDescriptors.tuple.pairOneTypeCode &&
    type.code <= sDescriptors.tuple.genericTupleTypeCode
  );
}

const sCollDescriptor = Object.freeze({
  code: typeCodeOf(constructorCode.simpleColl),
  simpleCollTypeCode: typeCodeOf(constructorCode.simpleColl),
  nestedCollTypeCode: typeCodeOf(constructorCode.nestedColl),
  embeddable: false
}) satisfies SType;

const sTupleDescriptor = Object.freeze({
  code: typeCodeOf(constructorCode.pairOne),
  pairOneTypeCode: typeCodeOf(constructorCode.pairOne),
  pairTwoTypeCode: typeCodeOf(constructorCode.pairTwo),
  tripleTypeCode: typeCodeOf(constructorCode.pairTwo),
  symmetricPairTypeCode: typeCodeOf(constructorCode.symmetricPair),
  quadrupleTypeCode: typeCodeOf(constructorCode.symmetricPair),
  genericTupleTypeCode: typeCodeOf(constructorCode.genericTuple),
  embeddable: false
}) satisfies SType;

export const sDescriptors = {
  bool: new SPrimitiveType<boolean>(0x01, noCoercion),
  byte: new SPrimitiveType<number>(0x02, noCoercion),
  short: new SPrimitiveType<number>(0x03, noCoercion),
  int: new SPrimitiveType<number>(0x04, noCoercion),
  long: new SPrimitiveType<BigIntInput, bigint>(0x05, ensureBigInt),
  bigInt: new SPrimitiveType<BigIntInput, bigint>(0x06, ensureBigInt),
  groupElement: new SPrimitiveType<ByteInput, Uint8Array>(0x07, ensureBytes),
  sigmaProp: new SPrimitiveType<SigmaConstant<Uint8Array>>(0x08, noCoercion),
  unit: new SMonomorphicType<null>(0x62, noCoercion),
  coll: sCollDescriptor,
  tuple: sTupleDescriptor
} satisfies { [key: string]: SType };

export function getEmbeddableType(typeCode: number) {
  switch (typeCode) {
    case sDescriptors.bool.code:
      return sDescriptors.bool;
    case sDescriptors.byte.code:
      return sDescriptors.byte;
    case sDescriptors.short.code:
      return sDescriptors.short;
    case sDescriptors.int.code:
      return sDescriptors.int;
    case sDescriptors.long.code:
      return sDescriptors.long;
    case sDescriptors.bigInt.code:
      return sDescriptors.bigInt;
    case sDescriptors.groupElement.code:
      return sDescriptors.groupElement;
    case sDescriptors.sigmaProp.code:
      return sDescriptors.sigmaProp;
    default:
      throw new Error(`The type code '0x${typeCode}' is not a valid primitive type code.`);
  }
}

export const MAX_CONSTANT_TYPES_LENGTH = 100;
export const MAX_CONSTANT_CONTENT_LENGTH = 4096;
export const MAX_CONSTANT_LENGTH = MAX_CONSTANT_TYPES_LENGTH + MAX_CONSTANT_CONTENT_LENGTH;

export class SigmaConstant<V = unknown, T extends SType = SType> {
  readonly #type!: T;
  readonly #data!: V;

  constructor(type: T, value: V) {
    this.#type = type;
    this.#data = value;
  }

  static from<D, T extends SType = SType>(bytes: Uint8Array | string): SigmaConstant<D, T> {
    const reader = new SigmaReader(bytes);
    const type = TypeSerializer.deserialize(reader);
    const data = DataSerializer.deserialize(type, reader);

    return new SigmaConstant(type as T, data as D);
  }

  get type(): T {
    return this.#type;
  }

  get data(): V {
    return this.#data;
  }

  toBytes(): Uint8Array {
    const writer = new SigmaWriter(MAX_CONSTANT_LENGTH);
    TypeSerializer.serialize(this.type, writer);
    DataSerializer.serialize(this.data, this.type, writer);

    return writer.toBytes();
  }

  toHex(): string {
    return hex.encode(this.toBytes());
  }
}

export function SByte(value: number): SigmaConstant<number>;
export function SByte(value?: number): typeof sDescriptors.byte;
export function SByte(value?: number) {
  return createPrimitiveValue(sDescriptors.byte, value);
}

export function SBool(value: boolean): SigmaConstant<boolean>;
export function SBool(value?: boolean): typeof sDescriptors.bool;
export function SBool(value?: boolean) {
  return createPrimitiveValue(sDescriptors.bool, value);
}

export function SShort(value: number): SigmaConstant<number>;
export function SShort(value?: number): typeof sDescriptors.short;
export function SShort(value?: number) {
  return createPrimitiveValue(sDescriptors.short, value);
}

export function SInt(value: number): SigmaConstant<number>;
export function SInt(value?: number): typeof sDescriptors.int;
export function SInt(value?: number) {
  return createPrimitiveValue(sDescriptors.int, value);
}

export function SLong(value: number | string | bigint): SigmaConstant<bigint>;
export function SLong(value?: number | string | bigint): typeof sDescriptors.long;
export function SLong(value?: number | string | bigint) {
  return createPrimitiveValue(
    sDescriptors.long,
    isDefined(value) ? sDescriptors.long.coerce(value) : undefined
  );
}

export function SBigInt(value: string | bigint): SigmaConstant<bigint>;
export function SBigInt(value?: string | bigint): typeof sDescriptors.bigInt;
export function SBigInt(value?: string | bigint) {
  return createPrimitiveValue(
    sDescriptors.bigInt,
    isDefined(value) ? sDescriptors.bigInt.coerce(value) : undefined
  );
}

export function SUnit(): SigmaConstant<null>;
export function SUnit(): typeof sDescriptors.unit;
export function SUnit() {
  return createPrimitiveValue(sDescriptors.unit, null);
}

export function SGroupElement(value: Uint8Array | string): SigmaConstant<Uint8Array>;
export function SGroupElement(value?: Uint8Array | string): typeof sDescriptors.groupElement;
export function SGroupElement(value?: Uint8Array | string) {
  return createPrimitiveValue(sDescriptors.groupElement, value);
}

export function SSigmaProp(
  value: SigmaConstant<Uint8Array>
): SigmaConstant<SigmaConstant<Uint8Array>>;
export function SSigmaProp(value?: SigmaConstant<Uint8Array>): typeof sDescriptors.sigmaProp;
export function SSigmaProp(value?: SigmaConstant<Uint8Array>) {
  return createPrimitiveValue(sDescriptors.sigmaProp, value);
}

function createPrimitiveValue<T>(
  type: SPrimitiveType<T> | SMonomorphicType<T>,
  value?: T
): SigmaConstant<T> | SType {
  return value !== undefined ? new SigmaConstant(type, type.coerce(value)) : type;
}

export type SConstructor<T> = (arg?: T) => SType | SCollType<SType>;

type SCollConstant<T> = SigmaConstant<ArrayLike<T>>;

export function SColl<T>(type: SConstructor<T>): SConstructor<ArrayLike<T>>;
export function SColl<T>(
  type: SConstructor<T>,
  elements?: ArrayLike<T> | Uint8Array
): SCollConstant<T>;
export function SColl<T>(
  type: SConstructor<T>,
  elements?: ArrayLike<T> | Uint8Array
): SCollConstant<T> | SConstructor<ArrayLike<T>> {
  const elementsType = type();
  if (!elements) return () => new SCollType(elementsType);

  if (elementsType.code === sDescriptors.byte.code && !(elements instanceof Uint8Array)) {
    elements = Uint8Array.from(elements as ArrayLike<number>);
  }

  return new SigmaConstant(new SCollType(elementsType), elements as ArrayLike<T>);
}

type STupleConstant<T> = SigmaConstant<T, STupleType>;

export function STuple(...items: SigmaConstant[]) {
  return new SigmaConstant(
    new STupleType(items.map((x) => x.type)),
    items.map((x) => x.data)
  );
}

export function SPair<L, R>(
  left: SigmaConstant<L>,
  right: SigmaConstant<R>
): STupleConstant<[L, R]>;
export function SPair<L, R>(left: SConstructor<L>, right: SConstructor<R>): SConstructor<[L, R]>;
export function SPair<L, R>(
  left: SigmaConstant<L> | SConstructor<L>,
  right: SigmaConstant<R> | SConstructor<R>
): STupleConstant<[L, R]> | SConstructor<[L, R]> {
  if (typeof left === "function") {
    return () => new STupleType([left(), (right as SConstructor<R>)()]);
  } else {
    return STuple(left, right as SigmaConstant<R>) as STupleConstant<[L, R]>;
  }
}

// STuple(SInt(1), SBool(false)).value;

// type STupleConstant<T> = SigmaConstant<ArrayLike<T>>;

// export function SPair<L extends SigmaConstant, R extends SigmaConstant>(
//   left: L,
//   right: R
// ): SigmaConstant<[L, R]> {
//   return STuple(left, right); // new SigmaConstant(descriptors.sigmaTuple, [left, right]);
// }

// SPair(SInt(1), SBool(false)).value[1].value

// const fskdj = STuple(SInt(1), SBool(false));

// const t = SColl(STuple(SInt, SInt), [1, true]).value[0];

// SColl(SColl(SByte), [
//   hex.decode("4c657427732063656c656272617465204572676f526166666c652120"),
//   hex.decode("4c657427732063656c656272617465204572676f526166666c652120"),
//   hex.decode("e730bbae0463346f8ce72be23ab8391d1e7a58f48ed857fcf4ee9aecf6915307")
// ]);

// SColl(SInt, hex.decode("deadbeef")); // should fail

// SColl(SGroupElement, [Uint8Array.from([1])]);
// SColl(SGroupElement, ["deaadbeaf", "cafebabe"]);
// SColl(SByte, hex.decode("deadbeef"));
// // console.log(SColl(SInt, Uint8Array.from([1])));
// SColl(SBigInt, [1n, "1"]);
// SColl(SBigInt, [1n, "1", 1]);
// SColl(SBool, [true, false, 1]);
// const t = SColl(SBool);
// SColl(SColl(SBool), [[true, true], [false]]);
// SColl(SColl(SColl(SBool)), [
//   [
//     [false, true],
//     [true, false, false]
//   ]
// ]);

// const ret = SColl(SColl(SColl(SBigInt)), [[[1n, "1"]]]);
