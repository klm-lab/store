import { assignObservableAndProxy, isSame } from "../util";
import type { DispatchType } from "../../types";

class ObservableMap extends Map {
  readonly #event: string;
  #init: boolean;
  readonly #dispatch: DispatchType;

  constructor(dispatch: DispatchType, event: string, init: boolean) {
    super();
    this.#event = event;
    this.#init = init;
    this.#dispatch = dispatch;
  }

  finishInit() {
    this.#init = false;
  }

  set(key: any, value: any) {
    // No dispatch on init
    if (this.#init) {
      super.set(
        key,
        assignObservableAndProxy(value, `${this.#event}`, this.#dispatch, true)
      );
      return this;
    }

    if (!isSame(super.get(key), value)) {
      super.set(
        key,
        assignObservableAndProxy(value, `${this.#event}`, this.#dispatch, true)
      );
      this.#dispatch(this.#event);
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

class ObservableSet extends Set {
  readonly #event: string;
  #init: boolean;
  readonly #dispatch: DispatchType;

  constructor(dispatch: DispatchType, event: string, init: boolean) {
    super();
    this.#event = event;
    this.#init = init;
    this.#dispatch = dispatch;
  }

  finishInit() {
    this.#init = false;
  }

  add(value: any) {
    // No dispatch on init
    if (this.#init) {
      super.add(
        assignObservableAndProxy(value, this.#event, this.#dispatch, true)
      );
      return this;
    }

    if (!super.has(value)) {
      super.add(
        assignObservableAndProxy(value, this.#event, this.#dispatch, true)
      );
      this.#dispatch(this.#event);
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

export { ObservableMap, ObservableSet };
