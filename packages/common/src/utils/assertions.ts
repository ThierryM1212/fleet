<<<<<<< HEAD
export type AssertErrorMessageInput = string | Error | (() => string);

export function assert(condition: boolean, errorMsg: AssertErrorMessageInput): asserts condition {
  if (!condition) {
    let error: Error | undefined = undefined;

    switch (typeof errorMsg) {
      case "string":
        error = new Error(errorMsg);
        break;
      case "function":
        error = new Error(errorMsg());
        break;
      default:
        error = errorMsg;
    }

    throw error;
  }
=======
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
>>>>>>> be6364f (common: refactor and add new assertion methods)
}

export function isEmpty<T extends object>(obj?: T): obj is undefined;
export function isEmpty<T>(array?: T[]): array is undefined;
export function isEmpty<T>(obj?: T[] | object): obj is undefined {
  if (!obj) {
    return true;
  }

  return Array.isArray(obj) ? obj.length === 0 : Object.keys(obj).length === 0;
}

export function some<T extends object>(obj?: T): obj is T;
export function some<T>(array?: T[]): array is T[];
export function some<T>(obj?: T[] | object): boolean {
  return !isEmpty(obj);
}

export function isTruthy<T>(v?: T): v is NonNullable<T> {
  return Boolean(v);
}

export function isFalsy<T>(v?: T): v is undefined {
  return !isTruthy(v);
}
