export abstract class Collection<T> implements Iterable<T> {
  protected readonly _items: T[];

  constructor() {
    this._items = [];
  }

  protected _isIndexOutOfBounds(index: number): boolean {
    return index < 0 || index >= this._items.length;
  }

  [Symbol.iterator](): Iterator<T> {
    let counter = 0;

    return {
      next: () => {
        return {
          done: counter >= this.length,
          value: this._items[counter++]
        };
      }
    };
  }

  public get length(): number {
    return this._items.length;
  }

  public get isEmpty(): boolean {
    return this.length === 0;
  }

  public toArray(): T[] {
    return [...this._items];
  }
}
