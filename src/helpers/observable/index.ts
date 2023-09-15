import { StoreController } from "../store";
import { assignObservableAndProxy, removeObservableAndProxy } from "../util";
import { InterceptOptionsType } from "../../types";

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
        assignObservableAndProxy(
          value,
          this.#event,
          this.#storeController,
          true
        )
      );
      return this;
    }
    // Not in init mode
    if (super.get(key) !== value) {
      const next = (options: InterceptOptionsType) => {
        super.set(
          options.key,
          assignObservableAndProxy(
            options.value,
            this.#event,
            this.#storeController,
            true
          )
        );
      };
      const changePreview = removeObservableAndProxy(this);
      changePreview.set(key, value);
      this.#storeController.handleDispatch(this.#event, {
        value,
        state: removeObservableAndProxy(this),
        key,
        action: "setInMap",
        next,
        changePreview
      });
    }
    return this;
  }

  clear() {
    const state = removeObservableAndProxy(this);
    const changePreview = removeObservableAndProxy(this);
    changePreview.clear();
    this.#storeController.handleDispatch(this.#event, {
      key: null,
      value: null,
      state: state,
      action: "clearInMap",
      next: () => {
        super.clear();
      },
      changePreview
    });
  }

  delete(key: any) {
    const state = removeObservableAndProxy(this);
    const next = (options: InterceptOptionsType) => {
      super.delete(options.key);
    };
    const changePreview = removeObservableAndProxy(this);
    changePreview.delete(key);
    this.#storeController.handleDispatch(this.#event, {
      key: key,
      value: null,
      state: state,
      action: "deleteInMap",
      next,
      changePreview
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

  add(value: any) {
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
      const state = removeObservableAndProxy(this);
      const changePreview = removeObservableAndProxy(this);
      changePreview.add(value);
      this.#storeController.handleDispatch(this.#event, {
        key: null,
        value,
        state,
        action: "addInSet",
        next: (options: InterceptOptionsType) => {
          super.add(
            assignObservableAndProxy(
              options.value,
              this.#event,
              this.#storeController,
              true
            )
          );
        },
        changePreview
      });
    }
    return this;
  }

  clear() {
    const state = removeObservableAndProxy(this);
    const changePreview = removeObservableAndProxy(this);
    changePreview.clear();
    this.#storeController.handleDispatch(this.#event, {
      key: null,
      value: null,
      state: state,
      action: "clearInSet",
      next: () => {
        super.clear();
      },
      changePreview
    });
  }

  delete(value: any) {
    const state = removeObservableAndProxy(this);
    const changePreview = removeObservableAndProxy(this);
    changePreview.delete(value);
    this.#storeController.handleDispatch(this.#event, {
      key: null,
      value,
      state: state,
      action: "deleteInSet",
      next: (options: InterceptOptionsType) => {
        super.delete(options.value);
      },
      changePreview
    });
    return true;
  }
}

export { ObservableMap, ObservableSet };
