import { _UtilError } from "../error";
import { STORE_OPTIONS_KEYS } from "../../constants/internal";
import type { DefaultStoreOptionsType } from "../../types";

class StoreController {
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
    this.#events[event].forEach((listener: any) => listener());
  }
}

export const storeController = new StoreController();

class ObservableMap extends Map {
  #events: string;

  constructor() {
    super();
    this.#events = "";
  }

  setEvent(event: string) {
    this.#events = event;
  }

  set(key: any, value: any) {
    if (super.get(key) !== value) {
      const result = super.set(key, value);
      storeController.dispatch(this.#events);
      return result;
    }
    return this;
  }

  clear() {
    super.clear();
    storeController.dispatch(this.#events);
  }

  delete(key: any) {
    const result = super.delete(key);
    storeController.dispatch(this.#events);
    return result;
  }
}

class ObservableSet extends Set {
  #events: string;

  constructor() {
    super();
    this.#events = "";
  }

  setEvent(event: string) {
    this.#events = event;
  }

  add(value: any) {
    if (!super.has(value)) {
      const result = super.add(value);
      storeController.dispatch(this.#events);
      return result;
    }
    return this;
  }

  clear() {
    super.clear();
    storeController.dispatch(this.#events);
  }

  delete(key: any) {
    const result = super.delete(key);
    storeController.dispatch(this.#events);
    return result;
  }
}

function createProxyValidator(event: string) {
  return {
    set: function (state: any, key: any, value: any) {
      if (!isSame(state[key], value)) {
        state[key] = assignObservableAndProxy(value, event);
        storeController.dispatch(event);
      }
      return true;
    },
    deleteProperty: (target: any, prop: any) => {
      delete target[prop];
      storeController.dispatch(event);
      return true;
    }
  };
}

function handleObservable(data: any, element: any, type: string, event: any) {
  data.forEach((v: any, k: any) => {
    if (type === "Map") {
      element.set(
        k,
        event ? assignObservableAndProxy(v, event) : removeObservableAndProxy(v)
      );
    }
    if (type === "Set") {
      element.add(
        event ? assignObservableAndProxy(v, event) : removeObservableAndProxy(v)
      );
    }
  });
  event && element.setEvent(event);
  return element;
}

export function assignObservableAndProxy(data: any, event: string) {
  if (data && data.constructor.name === "Array") {
    return new Proxy(data, createProxyValidator(event));
  }
  if (data && data.constructor.name === "Map") {
    return handleObservable(data, new ObservableMap(), "Map", event);
  }
  if (data && data.constructor.name === "Set") {
    return handleObservable(data, new ObservableSet(), "Set", event);
  }
  if (data && data.constructor.name === "Object") {
    const entries: any = Object.entries(data).map(([key, value]) => {
      return [key, assignObservableAndProxy(value, event)];
    });
    return new Proxy(Object.fromEntries(entries), createProxyValidator(event));
  }
  return data;
}

export function removeObservableAndProxy(data: any) {
  if (data && data.constructor.name === "Array") {
    return data.map(removeObservableAndProxy);
  }
  if (data && data.constructor.name === "ObservableMap") {
    return handleObservable(data, new Map(), "Map", null);
  }
  if (data && data.constructor.name === "ObservableSet") {
    return handleObservable(data, new Set(), "Set", null);
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

function isSame(value1: any, value2: any): boolean {
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
