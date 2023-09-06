import { _UtilError } from "../error";
import {
  GROUP_STORE_EVENT,
  PRIVATE_STORE_EVENT
} from "../../constants/internal";
import type { StoreParamsType, StoreType, UserParamsType } from "../../types";
import { Store, StoreController } from "../store";
import {
  _checkListenToEvent,
  _checkOnEvent,
  _validateStore,
  _warnProdNodeENV,
  checkReWriteStoreAndGetResult
} from "../notAllProd";

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

export function getData(
  userParams: UserParamsType,
  storeParams: StoreParamsType
) {
  const { paths, target } = userParams;
  const { store, storeType } = storeParams;

  const storeKey = paths[0];

  if (storeKey === "_D" && storeType === "slice") {
    return removeObservableAndProxy(store.store);
  }

  if (storeKey === "_A" && storeType === "slice") {
    return store.actions;
  }

  if (paths[1] === "_A") {
    return store.actions[storeKey];
  }

  if (paths[1] === "_D") {
    return removeObservableAndProxy(store.store[storeKey]);
  }

  return removeObservableAndProxy(
    checkReWriteStoreAndGetResult(storeParams, target)
  );
}

export function getEventAndPath(storeParams: StoreParamsType, target?: string) {
  const paths = target ? target.split(".") : [];
  const EVENT =
    storeParams.storeType === "group"
      ? paths[0] ?? GROUP_STORE_EVENT
      : PRIVATE_STORE_EVENT;
  return {
    event: EVENT,
    paths
  };
}

export function attachEvent(store: any, storeParams: StoreParamsType) {
  const { storeController } = storeParams;
  store.on = function (event: string, callback: any) {
    _checkOnEvent(event);
    const { event: EVENT, paths } = getEventAndPath(storeParams);
    return storeController.subscribe(EVENT, () => {
      callback(getData({ paths }, storeParams));
    });
  };
  store.listenTo = function (event: string, callback: any) {
    _checkListenToEvent(event, callback, storeParams);
    const { event: EVENT, paths } = getEventAndPath(storeParams, event);
    return storeController.subscribe(EVENT, () => {
      callback(getData({ paths, target: event }, storeParams));
    });
  };
  return store;
}

export function getNewStore<S>(store: S): StoreParamsType {
  _warnProdNodeENV();
  const storeType = getStoreType(store);
  const appStore = new Store();
  if (storeType === "group") {
    _validateStore(store);
    appStore.init(store);
    return {
      storeType: "group",
      store: {
        store: appStore.store,
        actions: appStore.actions
      },
      storeController: appStore.storeController
    };
  }
  appStore.initPrivate(store);
  return {
    storeType: "slice",
    store: {
      store: appStore.privateStore,
      actions: appStore.privateStoreActions
    },
    storeController: appStore.storeController
  };
}
