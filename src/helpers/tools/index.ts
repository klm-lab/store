import { _UtilError } from "../error";
import {
  GROUP_STORE_EVENT,
  PRIVATE_STORE_EVENT
} from "../../constants/internal";
import { StoreParamsType, StoreType } from "../../types";

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
    /* We check if someone subscribe to group event and if current event is not privateEvent.
     * If so, we call all group listener else, we do nothing
     * */
    if (GROUP_STORE_EVENT in this.#events && event !== PRIVATE_STORE_EVENT) {
      this.#events[GROUP_STORE_EVENT].forEach((listener: any) => listener());
    }

    if (!(event in this.#events)) {
      return;
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
        message: `Property ${storeKey} is not an object. Any data + action give a slice. Any non object data without action give a slice. Any data without action give a group which required object as first entry.`,
        state: store[storeKey]
      });
    }
  }
}

export function getStoreType(store: any): StoreType {
  let storeType: string = "slice";
  if (typeof store === "undefined" || store === null) {
    throw _UtilError({
      name: `Creating store`,
      message: `The store is empty`,
      state: store
    });
  }

  if (store?.constructor?.name !== "Object") {
    throw _UtilError({
      name: `Creating store`,
      message: `The store is not an object`,
      state: store
    });
  }
  const STORE_KEYS = Object.keys(store);
  for (let i = 0; i < STORE_KEYS.length; i++) {
    if (
      store[STORE_KEYS[i]] !== null &&
      store[STORE_KEYS[i]].constructor.name === "Object"
    ) {
      storeType = "group";
    } else {
      if (typeof store[STORE_KEYS[i]] === "function") {
        storeType = "slice";
        break;
      }
    }
  }

  return storeType as StoreType;
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

function checkOnEvent(event: string) {
  if (process.env.NODE_ENV !== "production" && event !== "change") {
    throw _UtilError({
      name: `Listen to event ${event}`,
      message: `This listener is for change event. Pass event 'change' to be able to listen.`,
      state: event
    });
  }
}

function checkStoreTarget(target?: string) {
  if (
    process.env.NODE_ENV !== "production" &&
    (target === "" || typeof target !== "string")
  ) {
    throw _UtilError({
      name: `Connecting to ${target}`,
      message: `Target is optional. But it need to be valid if passed. Actual value is empty, fix it or remove it`
    });
  }
}

export function checkReWriteStoreAndGetResult(
  storeParams: StoreParamsType,
  target?: string
) {
  const PATHS = target ? target.split(".") : [];
  const { store, storeType } = storeParams;
  let result: any = {};
  if (storeType === "slice") {
    result = {
      ...store.store,
      ...store.actions
    };
  } else {
    for (const key in store.store) {
      result[key] = {
        ...store.store[key],
        ...store.actions[key]
      };
    }
  }

  PATHS.forEach((p) => {
    if (
      process.env.NODE_ENV !== "production" &&
      result &&
      typeof result[p] === "undefined"
    ) {
      throw _UtilError({
        name: `Connecting to ${target}`,
        message: `${p} is undefined in the store.`
      });
    }

    result = result ? result[p] : undefined;
  });
  return result;
}

function checkListenToEvent(
  event: string,
  callback: any,
  storeParams: StoreParamsType
) {
  const { storeType } = storeParams;
  if (
    (process.env.NODE_ENV !== "production" &&
      (typeof event as unknown) !== "string") ||
    event === "" ||
    event === null ||
    event === undefined ||
    typeof event === "undefined"
  ) {
    throw _UtilError({
      name: `Listen to event ${event}`,
      message: `Provide a valid event to be able to listen.`
    });
  }

  const PATHS = event.split(".");
  const storeKey = PATHS[0];
  if (["_D", "_A"].includes(storeKey) && storeType === "slice") {
    return;
  }

  if (["_D", "_A"].includes(PATHS[1]) && storeType === "group") {
    return;
  }

  checkReWriteStoreAndGetResult(storeParams, event);

  if (typeof callback !== "function") {
    throw _UtilError({
      name: `Listen to event ${event}`,
      message: `Provide a valid callback, a function to be able to listen.`
    });
  }
}

export const _validateStore =
  process.env.NODE_ENV !== "production" ? validateStore : () => void 0;

export const _checkOnEvent =
  process.env.NODE_ENV !== "production" ? checkOnEvent : () => void 0;

export const _checkListenToEvent =
  process.env.NODE_ENV !== "production" ? checkListenToEvent : () => void 0;

export const _checkStoreTarget =
  process.env.NODE_ENV !== "production" ? checkStoreTarget : () => void 0;
