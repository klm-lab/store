import { StoreController } from "../store";
import {
  assignObservableAndProxy,
  isSame,
  removeObservableAndProxy
} from "../util";
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
    // We make to avoid ant interception on init
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
    // Not in init mode
    if (!isSame(super.get(key), value)) {
      // Clone the state
      const state = removeObservableAndProxy(this);
      // Add in the clone
      state.set(key, value);

      this.#storeController.handleDispatch({
        event: this.#event,
        value,
        state: state, // <-- send clone
        interceptorAction: "allowAction", // <-- By default allow the action
        key,
        action: "setInMap",
        next: (options: InterceptOptionsType) => {
          if (options.interceptorAction !== "rejectAction") {
            super.set(
              options.key,
              assignObservableAndProxy(
                options.value,
                // `${this.#event}.${key}`,
                `${this.#event}`,
                this.#storeController,
                true
              )
            );
          }
        }
      });
    }
    return this;
  }

  clear() {
    // Clone the state
    const state = removeObservableAndProxy(this);
    // Clear the clone
    state.clear();
    this.#storeController.handleDispatch({
      event: this.#event,
      key: null,
      value: null,
      state: state, // <-- send clone
      interceptorAction: "allowAction", // <-- By default allow the action
      action: "clearInMap",
      next: (options: InterceptOptionsType) => {
        if (options.interceptorAction !== "rejectAction") {
          super.clear();
        }
        /* If it is a reject, then nothing change.
         * We do that to preserve the order of data in the collection
         * */
      }
    });
  }

  delete(key: any) {
    // Clone the state
    const state = removeObservableAndProxy(this);
    // Delete in clone
    state.delete(key);
    this.#storeController.handleDispatch({
      event: this.#event,
      key: key,
      value: null,
      state: state, // <-- send clone
      interceptorAction: "allowAction", // <-- By default allow the action
      action: "deleteInMap",
      next: (options: InterceptOptionsType) => {
        if (options.interceptorAction !== "rejectAction") {
          // We execute interceptor decision
          super.delete(options.key);
        }
        /* If it is a reject, then nothing change.
         * We do that to preserve the order of data in the collection
         * */
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

  add(value: any) {
    if (this.#init) {
      /*
       * A set collection is unique, so if we add a collection in a set collection,
       * We can still access that collection inside the set and update it. BUt that collection is not named.
       * EX: new Set().add(new Map().set(new Set())) and so son. There are no key to extends with event.
       * if we set a string in the collection: EX: new Set().add("string"),
       * then that will never change in that collection , so no need to extend it with the event.
       * Any action in set have a unique LOCKED EVENT
       * */
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
      // Clone the state
      const state = removeObservableAndProxy(this);
      // Add in the clone
      state.add(value);
      this.#storeController.handleDispatch({
        event: this.#event,
        key: null,
        value,
        state: state, // <-- send clone
        interceptorAction: "allowAction", // <-- By default allow the action
        action: "addInSet",
        next: (options: InterceptOptionsType) => {
          if (options.interceptorAction !== "rejectAction") {
            super.add(
              assignObservableAndProxy(
                options.value,
                this.#event,
                this.#storeController,
                true
              )
            );
          }
          /*
           * If it is a reject, then nothing change.
           * We do that to preserve the order of data in the collection
           * */
        }
      });
    }
    return this;
  }

  clear() {
    // Clone the state
    const state = removeObservableAndProxy(this);
    // Clear the clone
    state.clear();
    this.#storeController.handleDispatch({
      event: this.#event,
      key: null,
      value: null,
      state: state, // <-- send clone
      interceptorAction: "allowAction", // <-- By default, allow the action
      action: "clearInSet",
      next: (options: InterceptOptionsType) => {
        if (options.interceptorAction !== "rejectAction") {
          super.clear();
        }
        /* If it is a reject, then nothing change.
         * We do that to preserve the order of data in the collection
         * */
      }
    });
  }

  delete(value: any) {
    // Clone the state
    const state = removeObservableAndProxy(this);
    // Delete in clone
    state.delete(value);
    this.#storeController.handleDispatch({
      event: this.#event,
      key: null,
      value,
      state: state, // <-- send clone
      action: "deleteInSet",
      interceptorAction: "allowAction", // <-- By default allow the action
      next: (options: InterceptOptionsType) => {
        if (options.interceptorAction !== "rejectAction") {
          // We execute interceptor decision
          super.delete(options.value);
        }
        /* If it is a reject, then nothing change.
         * We do that to preserve the order of data in the collection
         * */
      }
    });
    return true;
  }
}

export { ObservableMap, ObservableSet };
