import { _0n, _127n, _128n, _7n, ensureBigInt } from "@fleet-sdk/common";
import { SigmaReader } from "./sigma/sigmaReader";
import { SigmaWriter } from "./sigma/sigmaWriter";

/**
 * A **variable-length quantity (VLQ)** is a universal code that uses an arbitrary number
 * of binary octets (eight-bit bytes) to represent an arbitrarily large integer. A VLQ
 * is essentially a base-128 representation of an unsigned integer with the addition of
 * the eighth bit to mark continuation of bytes. VLQ is identical to LEB128 except in
 * endianness. See the example below.
 */

/**
 * Write an unsigned integer value as VLQ to a `SigmaWriter`.
 * @param value: Integer value
 * @param writer: Sigma writer
 * @returns Sigma writer passed as function argument.
 */
export function writeVLQ(writer: SigmaWriter, value: number): SigmaWriter {
  // source: https://stackoverflow.com/a/3564685

  if (value === 0) {
    return writer.write(0);
  } else if (value < 0) {
    throw new RangeError("Variable Length Quantity not supported for negative numbers.");
  }

  do {
    let lower7bits = value & 0x7f;
    value >>= 7;

    if (value > 0) {
      lower7bits |= 0x80;
    }

    writer.write(lower7bits);
  } while (value > 0);

  return writer;
}

/**
 * Decode VLQ bytes to an unsigned integer value
 * @param reader VLQ bytes
 * @returns Unsigned integer value
 */
export function readVLQ(reader: SigmaReader): number {
  if (reader.isEmpty) {
    return 0;
  }

  let value = 0;
  let shift = 0;
  let lower7bits = 0;

  do {
    lower7bits = reader.readByte();
    value |= (lower7bits & 0x7f) << shift;
    shift += 7;
  } while ((lower7bits & 0x80) != 0);

  return value;
}

/**
 * Write an unsigned integer value as VLQ to a `SigmaWriter`.
 * @param value: Big integer value
 * @param writer: Sigma writer
 * @returns Sigma writer passed as function argument.
 */
export function writeBigVLQ(writer: SigmaWriter, value: bigint): SigmaWriter {
  // source: https://stackoverflow.com/a/3564685

  if (value === _0n) {
    return writer.write(0);
  } else if (value < _0n) {
    throw new RangeError("Variable Length Quantity not supported for negative numbers");
  }

  do {
    let lower7bits = Number(value & _127n);
    value >>= _7n;

    if (value > 0) {
      lower7bits |= 0x80;
    }

    writer.write(lower7bits);
  } while (value > 0);

  return writer;
}

/**
 * Decode VLQ bytes to an unsigned big integer value
 * @param reader VLQ bytes
 * @returns Unsigned integer value
 */
export function readBigVLQ(reader: SigmaReader): bigint {
  if (reader.isEmpty) {
    return _0n;
  }

  let value = _0n;
  let shift = _0n;
  let lower7bits = _0n;

  do {
    lower7bits = BigInt(reader.readByte());
    value |= (lower7bits & _127n) << shift;
    shift += _7n;
  } while ((lower7bits & _128n) != _0n);

  return value;
}

/**
 * Estimates the byte size of a given unsigned integer.
 * @param value: the value to be evaluated.
 * @returns the byte size of the value.
 */
export function estimateVLQSize(value: number | bigint | string): number {
  value = ensureBigInt(value);
  let size = 0;

  do {
    size++;
    value /= _128n;
  } while (value > _0n);

  return size;
}
