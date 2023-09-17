import { StoreController } from "../store";
import { assignObservableAndProxy, isSame } from "../util";

class ObservableMap extends Map {
  readonly #event: string;
  #init: boolean;
  readonly #storeController: StoreController;

  constructor(storeController: StoreController, event: string, init: boolean) {
    super();
    this.#event = event;
    this.#init = init;
    this.#storeController = storeController;
  }

  finishInit() {
    this.#init = false;
  }

  set(key: any, value: any) {
    // No dispatch on init
    if (this.#init) {
      super.set(
        key,
        assignObservableAndProxy(
          value,
          //`${this.#event}.${key}`,
          `${this.#event}`,
          this.#storeController,
          true
        )
      );
      return this;
    }

    if (!isSame(super.get(key), value)) {
      super.set(
        key,
        assignObservableAndProxy(
          value,
          `${this.#event}`,
          this.#storeController,
          true
        )
      );
      this.#storeController.dispatch(this.#event);
    }
    return this;
  }

  clear() {
    super.clear();
    this.#storeController.dispatch(this.#event);
  }

  delete(key: any) {
    super.delete(key);
    this.#storeController.dispatch(this.#event);
    return true;
  }
}

class ObservableSet extends Set {
  readonly #event: string;
  #init: boolean;
  readonly #storeController: StoreController;

  constructor(storeController: StoreController, event: string, init: boolean) {
    super();
    this.#event = event;
    this.#init = init;
    this.#storeController = storeController;
  }

  finishInit() {
    this.#init = false;
  }

  add(value: any) {
    // No dispatch on init
    if (this.#init) {
      super.add(
        assignObservableAndProxy(
          value,
          this.#event,
          this.#storeController,
          true
        )
      );
      return this;
    }

    if (!super.has(value)) {
      super.add(
        assignObservableAndProxy(
          value,
          this.#event,
          this.#storeController,
          true
        )
      );
      this.#storeController.dispatch(this.#event);
    }
    return this;
  }

  clear() {
    super.clear();
    this.#storeController.dispatch(this.#event);
  }

  delete(value: any) {
    super.delete(value);
    this.#storeController.dispatch(this.#event);
    return true;
  }
}

export { ObservableMap, ObservableSet };
