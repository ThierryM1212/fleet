import { Box, TokenAmount } from "../../types";
import { ISelectionStrategy } from "./strategies/ISelectionStrategy";
import { CustomSelectionStrategy, SelectorFunction } from "./strategies/customSelectionStrategy";

export type SelectionTarget = { nanoErgs: bigint; tokens?: TokenAmount<bigint>[] };

export class BoxSelector {
  private readonly _inputs: Box<bigint>[];
  private readonly _target?: SelectionTarget;
  private _strategy?: ISelectionStrategy;

  constructor(inputs: Box<bigint>[], target?: SelectionTarget) {
    this._inputs = inputs;
    this._target = target;
  }

  public defineStrategy(strategy: ISelectionStrategy | SelectorFunction): BoxSelector {
    if (this._isISelectionStrategyImplementation(strategy)) {
      this._strategy = strategy;
    } else {
      this._strategy = new CustomSelectionStrategy(strategy);
    }

    return this;
  }

  public select(): Box<bigint>[] {
    if (!this._strategy) {
      return this._inputs;
    }

    return this._strategy.select(this._inputs, this._target);
  }

  // public ensureInclusion(selector: (box: Box) => boolean): BoxSelector {
  //   throw Error("Not implemented");
  // }

  // public orderBy(selector: (box: Box) => boolean): BoxSelector {
  //   throw Error("Not implemented");
  // }

  private _isISelectionStrategyImplementation(obj: unknown): obj is ISelectionStrategy {
    if ((obj as ISelectionStrategy).select) {
      return true;
    }

    return false;
  }
}
