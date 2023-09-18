import { createProxy, isSame } from "../util";
import type { DispatchType } from "../../types";

class SpyMap extends Map {
  readonly #event: string;
  #init: boolean;
  readonly #dispatch: DispatchType;

  constructor(dispatch: DispatchType, event: string, init: boolean) {
    super();
    this.#event = event;
    this.#init = init;
    this.#dispatch = dispatch;
  }

  end() {
    this.#init = false;
  }

  set(key: any, value: any) {
    if (!isSame(super.get(key), value)) {
      super.set(
        key,
        createProxy(value, `${this.#event}`, this.#dispatch, true)
      );
      !this.#init && this.#dispatch(this.#event);
    }
    return this;
  }

  clear() {
    super.clear();
    this.#dispatch(this.#event);
  }

  delete(key: any) {
    super.delete(key);
    this.#dispatch(this.#event);
    return true;
  }
}

class SpySet extends Set {
  readonly #event: string;
  #init: boolean;
  readonly #dispatch: DispatchType;

  constructor(dispatch: DispatchType, event: string, init: boolean) {
    super();
    this.#event = event;
    this.#init = init;
    this.#dispatch = dispatch;
  }

  end() {
    this.#init = false;
  }

  add(value: any) {
    if (!super.has(value)) {
      super.add(createProxy(value, this.#event, this.#dispatch, true));
      !this.#init && this.#dispatch(this.#event);
    }
    return this;
  }

  clear() {
    super.clear();
    this.#dispatch(this.#event);
  }

  delete(value: any) {
    super.delete(value);
    this.#dispatch(this.#event);
    return true;
  }
}

export { SpyMap, SpySet };
