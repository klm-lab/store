import { _UtilError } from "../error";
import {
  GROUP_STORE_EVENT,
  PRIVATE_STORE_EVENT
} from "../../constants/internal";
import type {
  ChangeHandlerType,
  InterceptOptionsType,
  StoreParamsType,
  StoreType,
  UserParamsType
} from "../../types";
import { Store, StoreController } from "../store";
import {
  _checkListenToEvent,
  _checkNull,
  _checkOnEvent,
  _validateStore,
  _warnProdNodeENV,
  checkReWriteStoreAndGetResult
} from "../notAllProd";
import { ObservableSet, ObservableMap } from "../observable";

export function dispatchEvent(event: string, storeController: StoreController) {
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

function handleChanges(
  params: ChangeHandlerType,
  storeController: StoreController
) {
  const { event, state, key, value, action } = params;
  let options = {} as InterceptOptionsType;
  if (params.action === "update") {
    options = {
      value,
      key,
      state: removeObservableAndProxy(state),
      action: action,
      overrideKey: (newKey: any) => {
        state[newKey] = assignObservableAndProxy(value, event, storeController);
        dispatchEvent(event, storeController);
      },
      allowAction: (validatedValue: any) => {
        state[key] = assignObservableAndProxy(
          validatedValue,
          event,
          storeController
        );
        dispatchEvent(event, storeController);
      },
      overrideKeyAndValue: (newKey: any, validatedValue: any) => {
        state[newKey] = assignObservableAndProxy(
          validatedValue,
          event,
          storeController
        );
        dispatchEvent(event, storeController);
      }
    };
  }
  if (params.action === "delete") {
    options = {
      value,
      key,
      state: removeObservableAndProxy(state),
      action: action,
      overrideKey: (newKey: any) => {
        delete state[newKey];
        dispatchEvent(event, storeController);
      },
      allowAction: () => {
        delete state[key];
        dispatchEvent(event, storeController);
      },
      overrideKeyAndValue: (newKey: any) => {
        delete state[newKey];
        dispatchEvent(event, storeController);
      }
    };
  }
  storeController.handleDispatch(event, options);
}

function createProxyValidator(event: string, storeController: StoreController) {
  return {
    set: function (state: any, key: any, value: any) {
      if (!isSame(state[key], value)) {
        handleChanges(
          { event, state, key, value, action: "update" },
          storeController
        );
      }
      return true;
    },
    deleteProperty: (target: any, prop: any) => {
      handleChanges(
        { event, state: target, key: prop, value: null, action: "delete" },
        storeController
      );
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
  element.finishInit && element.finishInit();
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
      new ObservableMap(storeController, event, true),
      "Map",
      event,
      storeController
    );
  }
  if (data && data.constructor.name === "Set") {
    return handleObservable(
      data,
      new ObservableSet(storeController, event, true),
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
  storeParams: StoreParamsType,
  isSnapShot = false
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
    return isSnapShot ? store.actions : store.actions[storeKey];
  }

  if (paths[1] === "_D") {
    return isSnapShot
      ? removeObservableAndProxy(store.store)
      : removeObservableAndProxy(store.store[storeKey]);
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

function sendDataWithMemo(
  event: string | undefined,
  callback: any,
  storeParams: StoreParamsType
) {
  const { storeController } = storeParams;
  const { event: EVENT, paths } = getEventAndPath(storeParams, event);
  const userParams = event
    ? {
        paths,
        target: event
      }
    : { paths };
  let snapShot = getData(userParams, storeParams);
  return storeController.subscribe(EVENT, () => {
    const newData = getData(userParams, storeParams);
    if (!isSame(snapShot, newData)) {
      snapShot = newData;
      callback(snapShot);
    }
  });
}

export function attachEvent(store: any, storeParams: StoreParamsType) {
  store.on = function (event: string, callback: any) {
    _checkOnEvent(event);
    return sendDataWithMemo(undefined, callback, storeParams);
  };
  store.listenTo = function (event: string, callback: any) {
    _checkListenToEvent(event, callback, storeParams);
    return sendDataWithMemo(event, callback, storeParams);
  };
  store.intercept = function (event: string, callback: any) {
    _checkListenToEvent(event, callback, storeParams);
    const { event: EVENT } = getEventAndPath(storeParams, event);
    const { storeController } = storeParams;
    return storeController.subscribe(EVENT + "_intercept", callback);
  };
  return store;
}

export function attachSnapshotHandler(
  store: any,
  storeParams: StoreParamsType
) {
  store.getActions = function (event?: string) {
    _checkNull(event);
    const paths = storeParams.storeType === "group" ? ["", "_A"] : ["_A"];
    return getData({ paths }, storeParams, true);
  };
  store.getDataSnapshot = function (event?: string) {
    _checkNull(event);
    const paths = storeParams.storeType === "group" ? ["", "_D"] : ["_D"];
    return getData({ paths }, storeParams, true);
  };
  store.getSnapshot = function (event?: string) {
    _checkNull(event);
    return getData({ paths: [] }, storeParams, true);
  };
  return store;
}

export function finalizeStore(store: any, storeParams: StoreParamsType) {
  return attachEvent(attachSnapshotHandler(store, storeParams), storeParams);
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
