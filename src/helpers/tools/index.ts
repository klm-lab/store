import { _UtilError } from "../error";
import {
  GROUP_STORE_EVENT,
  PRIVATE_STORE_EVENT,
  STORE_OPTIONS_KEYS
} from "../../constants/internal";
import type { DefaultStoreOptionsType } from "../../types";

export class StoreController {
  readonly #events: any;

  constructor() {
    this.#events = {};
  }

  subscribe(event: string, listener: any) {
    if (!(event in this.#events)) {
      this.#events[event] = new Set();
    }
    this.#events[event].add(listener);
    return () => this.unsubscribe(event, listener);
  }

  unsubscribe(event: string, listener: any) {
    if (event in this.#events) {
      this.#events[event].delete(listener);
    }
  }

  dispatch(event: string) {
    if (!(event in this.#events)) {
      return;
    }
    /* We check if someone subscribe to group event and if current event is not privateEvent.
     * If so, we call all group listener else, we do nothing
     * */
    if (GROUP_STORE_EVENT in this.#events && event !== PRIVATE_STORE_EVENT) {
      this.#events[GROUP_STORE_EVENT].forEach((listener: any) => listener());
    }
    /*
     * We call the event listener
     * */
    this.#events[event].forEach((listener: any) => listener());
  }
}

class ObservableMap extends Map {
  readonly #event: string;
  readonly #storeController: StoreController;

  constructor(storeController: StoreController, event: string) {
    super();
    this.#event = event;
    this.#storeController = storeController;
  }

  set(key: any, value: any) {
    if (super.get(key) !== value) {
      const result = super.set(
        key,
        assignObservableAndProxy(value, this.#event, this.#storeController)
      );
      dispatchEvent(this.#event, this.#storeController);
      return result;
    }
    return this;
  }

  clear() {
    super.clear();
    dispatchEvent(this.#event, this.#storeController);
  }

  delete(key: any) {
    const result = super.delete(key);
    dispatchEvent(this.#event, this.#storeController);
    return result;
  }
}

class ObservableSet extends Set {
  readonly #event: string;
  readonly #storeController: StoreController;

  constructor(storeController: StoreController, event: string) {
    super();
    this.#event = event;
    this.#storeController = storeController;
  }

  add(value: any) {
    if (!super.has(value)) {
      const result = super.add(
        assignObservableAndProxy(value, this.#event, this.#storeController)
      );
      dispatchEvent(this.#event, this.#storeController);
      return result;
    }
    return this;
  }

  clear() {
    super.clear();
    dispatchEvent(this.#event, this.#storeController);
  }

  delete(key: any) {
    const result = super.delete(key);
    dispatchEvent(this.#event, this.#storeController);
    return result;
  }
}

function dispatchEvent(event: string, storeController: StoreController) {
  /* We check if current event is not privateEvent.
   * If so, we call all group listener else, we do nothing
   * */
  if (event !== PRIVATE_STORE_EVENT) {
    storeController && storeController.dispatch(GROUP_STORE_EVENT);
  }
  /*
   * We call the event listener
   * */
  storeController && storeController.dispatch(event);
}

function createProxyValidator(event: string, storeController: StoreController) {
  return {
    set: function (state: any, key: any, value: any) {
      if (!isSame(state[key], value)) {
        state[key] = assignObservableAndProxy(value, event, storeController);
        dispatchEvent(event, storeController);
      }
      return true;
    },
    deleteProperty: (target: any, prop: any) => {
      delete target[prop];
      dispatchEvent(event, storeController);
      return true;
    }
  };
}

function handleObservable(
  data: any,
  element: any,
  type: string,
  event: any,
  storeController: StoreController | null
) {
  data.forEach((v: any, k: any) => {
    if (type === "Map") {
      element.set(
        k,
        event
          ? storeController &&
              assignObservableAndProxy(v, event, storeController)
          : removeObservableAndProxy(v)
      );
    }
    if (type === "Set") {
      element.add(
        event
          ? storeController &&
              assignObservableAndProxy(v, event, storeController)
          : removeObservableAndProxy(v)
      );
    }
  });
  return element;
}

export function assignObservableAndProxy(
  data: any,
  event: string,
  storeController: StoreController
) {
  if (data && data.constructor.name === "Array") {
    return new Proxy(data, createProxyValidator(event, storeController));
  }
  if (data && data.constructor.name === "Map") {
    return handleObservable(
      data,
      new ObservableMap(storeController, event),
      "Map",
      event,
      storeController
    );
  }
  if (data && data.constructor.name === "Set") {
    return handleObservable(
      data,
      new ObservableSet(storeController, event),
      "Set",
      event,
      storeController
    );
  }
  if (data && data.constructor.name === "Object") {
    const entries: any = Object.entries(data).map(([key, value]) => {
      return [key, assignObservableAndProxy(value, event, storeController)];
    });
    return new Proxy(
      Object.fromEntries(entries),
      createProxyValidator(event, storeController)
    );
  }
  return data;
}

export function removeObservableAndProxy(data: any) {
  if (data && data.constructor.name === "Array") {
    return data.map(removeObservableAndProxy);
  }
  if (data && data.constructor.name === "ObservableMap") {
    return handleObservable(data, new Map(), "Map", null, null);
  }
  if (data && data.constructor.name === "ObservableSet") {
    return handleObservable(data, new Set(), "Set", null, null);
  }
  if (data && data.constructor.name === "Object") {
    const entries: any = Object.entries(Object.assign({}, data)).map(
      ([key, value]) => {
        return [key, removeObservableAndProxy(value)];
      }
    );
    return Object.fromEntries(entries);
  }
  return data;
}

function validateStore(store: any) {
  if (store === null || store?.constructor?.name !== "Object") {
    throw _UtilError({
      name: `Creating store`,
      message: `The store is not an object"`,
      state: store
    });
  }
  for (const storeKey in store) {
    if (store[storeKey]?.constructor.name !== "Object") {
      throw _UtilError({
        name: `Creating store`,
        message: `Property ${storeKey} is not an object. If you want to create a a sliceStore. set storeOptions.storeType to 'slice' or remove storeOptions.storeType`,
        state: store[storeKey]
      });
    }
  }
}

function checkStoreOptions(storeOptions: DefaultStoreOptionsType) {
  if (typeof storeOptions === "undefined") {
    return;
  }

  if (storeOptions === null || storeOptions?.constructor?.name !== "Object") {
    throw _UtilError({
      name: `Creating store`,
      message: `The storeOptions is not an object with '${STORE_OPTIONS_KEYS.join(
        " & "
      )}' as properties. Correct it or remove it"`,
      state: storeOptions
    });
  }

  if (Object.keys(storeOptions).length <= 0) {
    throw _UtilError({
      name: `Creating store`,
      message: `The storeOptions is empty, fill it with '${STORE_OPTIONS_KEYS.join(
        " | "
      )}' as properties or remove it"`,
      state: storeOptions
    });
  }
  for (const optionsKey in storeOptions) {
    if (!STORE_OPTIONS_KEYS.includes(optionsKey)) {
      throw _UtilError({
        name: `Creating store`,
        message: `Only ${STORE_OPTIONS_KEYS.join(
          " & "
        )} are allowed as options for the moment. Please remove ${optionsKey}`,
        state: storeOptions
      });
    }
    if (
      optionsKey === "dispatchMode" &&
      !["hook", "everywhere"].includes(storeOptions[optionsKey] as string)
    ) {
      throw _UtilError({
        name: `Creating store`,
        message: `Property ${optionsKey} can only be 'hook' or 'everywhere'. Make sure it is otherwise, remove the options`,
        state: storeOptions
      });
    }
  }
}

export function isSame(value1: any, value2: any): boolean {
  let isValid = true;
  if (
    value1 === undefined ||
    value1 === null ||
    value2 === undefined ||
    value2 === null
  ) {
    return Object.is(value1, value2);
  }
  if (
    value1.constructor.name === "Array" &&
    value2.constructor.name === "Array" &&
    value1.length === value2.length
  ) {
    for (let i = 0; i < value1.length; i++) {
      isValid = isValid && isSame(value1[i], value2[i]);
      if (!isValid) {
        break;
      }
    }
    return isValid;
  }
  if (
    ((value1 instanceof Set && value2 instanceof Set) ||
      (value1 instanceof Map && value2 instanceof Map)) &&
    value1.size === value2.size
  ) {
    const values1Iterator = value1.values();
    const values2Iterator = value2.values();
    for (let i = 0; i < value1.size; i++) {
      isValid =
        isValid &&
        isSame(values1Iterator.next().value, values2Iterator.next().value);
      if (!isValid) {
        break;
      }
    }
    return isValid;
  }
  if (
    value1.constructor.name === "Object" &&
    value2.constructor.name === "Object" &&
    Object.keys(value1).length === Object.keys(value2).length
  ) {
    const values1Entries = Object.entries(value1);
    for (let i = 0; i < values1Entries.length; i++) {
      isValid = isValid && isSame(values1Entries[i], Object.entries(value2)[i]);
      if (!isValid) {
        break;
      }
    }
    return isValid;
  }
  return Object.is(value1, value2);
}

export const _validateStore =
  process.env.NODE_ENV !== "production" ? validateStore : () => void 0;
export const _checkStoreOptions =
  process.env.NODE_ENV !== "production" ? checkStoreOptions : () => void 0;
