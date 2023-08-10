import { assert, first, last } from "@fleet-sdk/common";
import { isColl, isTuple } from "./assertions";
import { SigmaReader } from "./sigmaReader";
import {
  ConstructorCode,
  PRIMITIVE_TYPE_RANGE,
  SCollType,
  sDescriptors,
  STupleType,
  SType
} from "./sigmaTypes";
import { SigmaWriter } from "./sigmaWriter";

export class TypeSerializer {
  static serialize(type: SType, writer: SigmaWriter) {
    if (type.embeddable) {
      writer.write(type.code);
    } else if (type.code === sDescriptors.unit.code) {
      writer.write(type.code);
    } else if (isColl(type)) {
      if (type.elementsType.embeddable) {
        writer.write(sDescriptors.coll.simpleCollTypeCode + type.elementsType.code);
      } else if (isColl(type.elementsType)) {
        const nestedColl = type.elementsType;
        if (nestedColl.elementsType.embeddable) {
          writer.write(sDescriptors.coll.nestedCollTypeCode + nestedColl.elementsType.code);
        } else {
          writer.write(sDescriptors.coll.simpleCollTypeCode);
          this.serialize(nestedColl, writer);
        }
      } else {
        writer.write(sDescriptors.coll.simpleCollTypeCode);
        this.serialize(type, writer);
      }
    } else if (isTuple(type)) {
      switch (type.elementsType.length) {
        case 2: {
          const left = first(type.elementsType);
          const right = last(type.elementsType);

          if (left.embeddable) {
            if (left.code === right.code) {
              // Symmetric pair of primitive types (`(Int, Int)`, `(Byte,Byte)`, etc.)
              writer.write(sDescriptors.tuple.symmetricPairTypeCode + left.code);
            } else {
              // Pair of types where first is primitive (`(_, Int)`)
              writer.write(sDescriptors.tuple.pairOneTypeCode + left.code);
              this.serialize(right, writer);
            }
          } else if (right.embeddable) {
            // Pair of types where second is primitive (`(Int, _)`)
            writer.write(sDescriptors.tuple.pairTwoTypeCode + right.code);
            this.serialize(left, writer);
          } else {
            // Pair of non-primitive types (`((Int, Byte), (Boolean,Box))`, etc.)
            writer.write(sDescriptors.tuple.pairOneTypeCode);
            this.serialize(left, writer);
            this.serialize(right, writer);
          }

          return;
        }
        case 3:
          writer.write(sDescriptors.tuple.tripleTypeCode);
          break;
        case 4:
          writer.write(sDescriptors.tuple.quadrupleTypeCode);
          break;
        default: {
          const len = type.elementsType.length;
          assert(len >= 2 && len <= 255, "Invalid type: tuples must have between 2 and 255 items.");

          // Generic tuple
          writer.write(sDescriptors.tuple.genericTupleTypeCode);
          writer.writeVLQ(len);
        }
      }

      for (let i = 0; i < type.elementsType.length; i++) {
        this.serialize(type.elementsType[i], writer);
      }
    } else {
      throw new Error("Serialization error: type not implemented.");
    }
  }

  static deserialize(r: SigmaReader): SType {
    const byte = r.readByte();
    assert(byte > 0, `Parsing Error: Unexpected type code '0x${byte.toString(16)}'`);

    if (byte < sDescriptors.tuple.genericTupleTypeCode) {
      const ctorCode = Math.floor(byte / PRIMITIVE_TYPE_RANGE);
      const embdCode = Math.floor(byte % PRIMITIVE_TYPE_RANGE);

      switch (ctorCode) {
        case ConstructorCode.Embeddable: {
          return getEmbeddableType(embdCode);
        }
        case ConstructorCode.SimpleColl: {
          const internal = embdCode === 0 ? this.deserialize(r) : getEmbeddableType(embdCode);

          return new SCollType(internal);
        }
        case ConstructorCode.NestedColl: {
          const internal = embdCode === 0 ? this.deserialize(r) : getEmbeddableType(embdCode);

          return new SCollType(new SCollType(internal));
        }
        case ConstructorCode.PairOne: {
          const internal =
            embdCode === 0
              ? [this.deserialize(r), this.deserialize(r)] // Pair of non-primitive types (`((Int, Byte), (Boolean,Box))`, etc.)
              : [getEmbeddableType(embdCode), this.deserialize(r)]; // Pair of types where first is primitive (`(_, Int)`)

          return new STupleType(internal);
        }
        case ConstructorCode.PairTwo: {
          const internal =
            embdCode === 0
              ? [this.deserialize(r), this.deserialize(r), this.deserialize(r)] // Triple of types
              : [this.deserialize(r), getEmbeddableType(embdCode)];

          return new STupleType(internal);
        }
        case ConstructorCode.SymmetricPair: {
          const internal =
            embdCode === 0
              ? [this.deserialize(r), this.deserialize(r), this.deserialize(r), this.deserialize(r)] // Quadruple of types
              : [getEmbeddableType(embdCode), getEmbeddableType(embdCode)]; // Symmetric pair of primitive types (`(Int, Int)`, `(Byte,Byte)`, etc.)

          return new STupleType(internal);
        }
      }
    } else {
      switch (byte) {
        case sDescriptors.tuple.genericTupleTypeCode: {
          const len = r.readVlq();
          const wrapped = new Array<SType>(len);
          for (let i = 0; i < len; i++) {
            wrapped[i] = this.deserialize(r);
          }

          return new STupleType(wrapped);
        }
        case sDescriptors.unit.code: {
          return sDescriptors.unit;
        }
      }
    }

    throw new Error("Not implemented.");
  }
}

function getEmbeddableType(typeCode: number) {
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
    default:
      return sDescriptors.sigmaProp;
  }
}
