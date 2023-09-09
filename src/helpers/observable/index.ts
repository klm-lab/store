import { StoreController } from "../store";
import { _UtilError } from "../error";
import {
  assignObservableAndProxy,
  removeObservableAndProxy,
  dispatchEvent
} from "../tools";

class ObservableMap extends Map {
  readonly #event: string;
  #init: boolean;
  readonly #storeController: StoreController;

  constructor(storeController: StoreController, event: string, init: boolean) {
    super();
    this.#event = event;
    this.#init = init;
    this.#storeController = storeController;
    this.finishInit = this.finishInit.bind(this);
  }

  finishInit() {
    this.#init = false;
  }

  set(key: any, value: any) {
    if (this.#init) {
      super.set(
        key,
        assignObservableAndProxy(value, this.#event, this.#storeController)
      );
      dispatchEvent(this.#event, this.#storeController);
      return this;
    }
    // Not in init mode
    if (super.get(key) !== value) {
      this.#storeController.handleDispatch(this.#event, {
        value,
        state: removeObservableAndProxy(this),
        key,
        action: "setInMap",
        allowAction: (validatedValue: any) => {
          super.set(
            key,
            assignObservableAndProxy(
              validatedValue,
              this.#event,
              this.#storeController
            )
          );
          dispatchEvent(this.#event, this.#storeController);
        },
        overrideKey: (newKey: any) => {
          super.set(
            newKey,
            assignObservableAndProxy(value, this.#event, this.#storeController)
          );
          dispatchEvent(this.#event, this.#storeController);
        },
        overrideKeyAndValue: (newKey: any, validatedValue: any) => {
          super.set(
            newKey,
            assignObservableAndProxy(
              validatedValue,
              this.#event,
              this.#storeController
            )
          );
          dispatchEvent(this.#event, this.#storeController);
        }
      });
    }
    return this;
  }

  clear() {
    const state = removeObservableAndProxy(this);
    this.#storeController.handleDispatch(this.#event, {
      key: null,
      value: null,
      state: state,
      action: "clearInMap",
      allowAction: () => {
        super.clear();
        dispatchEvent(this.#event, this.#storeController);
      },
      overrideKey: () => void 0,
      overrideKeyAndValue: () => void 0
    });
  }

  delete(key: any) {
    const state = removeObservableAndProxy(this);
    this.#storeController.handleDispatch(this.#event, {
      key: null,
      value: null,
      state: state,
      action: "deleteInMap",
      allowAction: () => {
        super.delete(key);
        dispatchEvent(this.#event, this.#storeController);
      },
      overrideKey: (newKey: any) => {
        super.delete(newKey);
        dispatchEvent(this.#event, this.#storeController);
      },
      overrideKeyAndValue: (newKey: any) => {
        super.delete(newKey);
        dispatchEvent(this.#event, this.#storeController);
      }
    });
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
    this.finishInit = this.finishInit.bind(this);
  }

  finishInit() {
    this.#init = false;
  }

  #noSet({ key }: any, state: any) {
    if (process.env.NODE_ENV !== "production") {
      throw _UtilError({
        name: `Override key ${key} in Set`,
        message: "Set does not have any key to override",
        state
      });
    }
  }

  add(value: any) {
    if (this.#init) {
      super.add(
        assignObservableAndProxy(value, this.#event, this.#storeController)
      );
      dispatchEvent(this.#event, this.#storeController);
      return this;
    }
    if (!super.has(value)) {
      const state = removeObservableAndProxy(this);
      this.#storeController.handleDispatch(this.#event, {
        key: null,
        value,
        state,
        action: "addInSet",
        allowAction: (validatedValue: any) => {
          super.add(
            assignObservableAndProxy(
              validatedValue,
              this.#event,
              this.#storeController
            )
          );
          dispatchEvent(this.#event, this.#storeController);
        },
        overrideKey: (key: any) => this.#noSet({ key }, state),
        overrideKeyAndValue: (key: any, newValue: any) =>
          this.#noSet({ key, value: newValue }, state)
      });
    }
    return this;
  }

  clear() {
    const state = removeObservableAndProxy(this);
    this.#storeController.handleDispatch(this.#event, {
      key: null,
      value: null,
      state: state,
      action: "clearInSet",
      allowAction: () => {
        super.clear();
        dispatchEvent(this.#event, this.#storeController);
      },
      overrideKey: (key?: any) => this.#noSet({ key }, state),
      overrideKeyAndValue: (key?: any, newValue?: any) =>
        this.#noSet({ key, value: newValue }, state)
    });
  }

  delete(key: any) {
    const state = removeObservableAndProxy(this);
    this.#storeController.handleDispatch(this.#event, {
      key: null,
      value: null,
      state: state,
      action: "deleteInSet",
      allowAction: () => {
        super.delete(key);
        dispatchEvent(this.#event, this.#storeController);
      },
      overrideKey: (newKey: any) => {
        super.delete(newKey);
        dispatchEvent(this.#event, this.#storeController);
      },
      overrideKeyAndValue: (newKey: any) => {
        super.delete(newKey);
        dispatchEvent(this.#event, this.#storeController);
      }
    });
    return true;
  }
}

export { ObservableMap, ObservableSet };
