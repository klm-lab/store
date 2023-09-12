import {
  ALL,
  GROUP,
  INTERCEPTION,
  SLICE,
  SUBSCRIPTION
} from "../../constants/internal";
import type {
  ChangeHandlerType,
  EventType,
  InterceptOptionsType,
  StoreParamsType,
  StoreType,
  StringObjectType
} from "../../types";
import { Store, StoreController } from "../store";
import {
  _checkListenToEvent,
  _checkNull,
  _checkOnEvent,
  _validateStore,
  _warnProdNodeENV,
  _utilError
} from "../developement";
import { checkReWriteStoreAndGetResult, createPath } from "../commonProdDev";
import { ObservableSet, ObservableMap } from "../observable";

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
      },
      allowAction: (validatedValue: any) => {
        state[key] = assignObservableAndProxy(
          validatedValue,
          event,
          storeController
        );
      },
      overrideKeyAndValue: (newKey: any, validatedValue: any) => {
        state[newKey] = assignObservableAndProxy(
          validatedValue,
          event,
          storeController
        );
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
      },
      allowAction: () => {
        delete state[key];
      },
      overrideKeyAndValue: (newKey: any) => {
        delete state[newKey];
      }
    };
  }
  storeController.handleDispatch(event, options);
}

function createProxyValidator(
  event: StringObjectType,
  storeController: StoreController
) {
  // console.warn("create proxy", event);
  return {
    set: function (state: any, key: any, value: any) {
      if (!isSame(state[key], value)) {
        handleChanges(
          { event: event[key], state, key, value, action: "update" },
          storeController
        );
      }
      return true;
    },
    deleteProperty: (target: any, prop: any) => {
      handleChanges(
        {
          event: event[prop],
          state: target,
          key: prop,
          value: null,
          action: "delete"
        },
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
  event: string | null,
  storeController: StoreController | null
) {
  data.forEach((v: any, k: any) => {
    if (type === "Map") {
      element.set(
        k,
        event ? storeController && v : removeObservableAndProxy(v)
      );
    }
    if (type === "Set") {
      element.add(event ? storeController && v : removeObservableAndProxy(v));
    }
  });
  element.finishInit && element.finishInit();
  return element;
}

export function assignObservableAndProxy(
  data: any,
  event: string,
  storeController: StoreController,
  lockEvent = false,
  helpers = {
    rootEvent: event,
    eventsObject: {} as StringObjectType
  }
) {
  // console.log("entered with =>", event, helpers.rootEvent);
  if (data && data.constructor.name === "Array") {
    /* We can use .at here but for maximum compatibility, we will go with old way.
     * We explicitly create eventsObject for array, because helpers.eventsObject is empty when
     * we come here
     */
    const tabKey = event.split(".");
    const key = tabKey[tabKey.length - 1];
    return new Proxy(
      data,
      createProxyValidator({ [key]: event }, storeController)
    );
  }
  if (data && data.constructor.name === "Map") {
    // console.log("map locked event", event);
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
      // console.log("working with =>", helpers.rootEvent, "key =>", key);
      /*
       * eventsObject will be empty at every assignObservableAndProxy call.
       * Because every assignObservableAndProxy create its own event, add it to eventsObject and pass it
       * to createProxyValidator.
       * We choose using Object instead of array, so when dispatching, we will just
       * dispatch the relevant key is the object, instead of filtering the array.
       *
       * eventsObject will contain possible event with the current key
       * */

      /*
       * We use lockEvent for Map or Set,
       * Let take this store: store = {data:{other: new Map(), value: 45}}.
       * Available target for the moment are
       * "data"
       * "data.other" // here other is a Map, but we can not go inside that map for the moment.
       * "data.value"
       * So when found an event for data.other. we lock it and use it for any changes inside the Map
       * */

      /*
       * The value of helpers.rootEvent is preserved and only changed on next loop.
       * Because we do not override it. We ca not just use event, because we change event.
       * Remove comment from console.log to debug and understand
       * */

      if (!lockEvent) {
        event =
          helpers.rootEvent !== "" ? `${helpers.rootEvent}.${key}` : `${key}`;
        // console.log("creating event =>", event);
        helpers.eventsObject[key] = event;
      } else {
        helpers.eventsObject[key] = event;
      }
      return [
        key,
        assignObservableAndProxy(value, event, storeController, lockEvent)
      ];
    });
    return new Proxy(
      Object.fromEntries(entries),
      createProxyValidator(helpers.eventsObject, storeController)
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
  let storeType: string = SLICE;
  if (typeof store === "undefined" || store === null) {
    _utilError({
      name: `Creating store`,
      message: `The store is empty`,
      state: store
    });
  }

  if (store?.constructor?.name !== "Object") {
    _utilError({
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
      storeType = GROUP;
    } else {
      if (typeof store[STORE_KEYS[i]] === "function") {
        storeType = SLICE;
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
  paths: string[],
  storeParams: StoreParamsType,
  isSnapShot = false
) {
  const { store, storeType } = storeParams;

  const storeKey = paths[0];

  if (storeKey === "_D" && storeType === SLICE) {
    return removeObservableAndProxy(store.store);
  }

  if (storeKey === "_A" && storeType === SLICE) {
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
    checkReWriteStoreAndGetResult(storeParams, paths)
  );
}

export function getEventAndPath(
  eventType: EventType,
  storeType: StoreType,
  target?: string
) {
  const paths = createPath(target);
  const firstKey = paths[0];
  const customGroupPath = paths[1];
  let canSubscribe = true;
  let event = "";
  if (eventType === SUBSCRIPTION) {
    if (storeType === "slice") {
      canSubscribe = firstKey !== "_A";
      event = firstKey ? (firstKey === "_D" ? ALL : firstKey) : ALL;
    }
    if (storeType === "group") {
      canSubscribe = customGroupPath !== "_A";
      event = firstKey ? (customGroupPath === "_D" ? ALL : firstKey) : ALL;
    }
  }
  if (eventType === INTERCEPTION) {
    if (storeType === "slice") {
      canSubscribe = firstKey !== "_A";
      event = target ? (firstKey === "_D" ? ALL : target) : ALL;
    }
    if (storeType === "group") {
      canSubscribe = customGroupPath !== "_A";
      event = target ? (customGroupPath === "_D" ? ALL : target) : ALL;
    }
    // event = target ?? ALL;
  }

  return { event, paths, canSubscribe };
}

function sendDataWithMemo(
  event: string | undefined,
  callback: any,
  storeParams: StoreParamsType
) {
  const { storeController } = storeParams;
  const {
    event: EVENT,
    paths,
    canSubscribe
  } = getEventAndPath(SUBSCRIPTION, storeParams.storeType, event);
  let snapShot = getData(paths, storeParams);
  if (!canSubscribe) {
    return () => void 0;
  }
  return storeController.subscribe(EVENT, () => {
    const newData = getData(paths, storeParams);
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
    const { event: EVENT, canSubscribe } = getEventAndPath(
      INTERCEPTION,
      storeParams.storeType,
      event
    );
    if (!canSubscribe) {
      return () => void 0;
    }
    const { storeController } = storeParams;
    return storeController.registerInterceptor(EVENT, callback);
  };
  return store;
}

export function attachSnapshotHandler(
  store: any,
  storeParams: StoreParamsType
) {
  store.getActions = function (event?: string) {
    _checkNull(event);
    const paths = storeParams.storeType === GROUP ? ["", "_A"] : ["_A"];
    return getData(paths, storeParams, true);
  };
  store.getDataSnapshot = function (event?: string) {
    _checkNull(event);
    const paths = storeParams.storeType === GROUP ? ["", "_D"] : ["_D"];
    return getData(paths, storeParams, true);
  };
  store.getSnapshot = function (event?: string) {
    _checkNull(event);
    return getData([], storeParams, true);
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
  if (storeType === GROUP) {
    _validateStore(store);
    appStore.init(store);
    return {
      storeType,
      store: {
        store: appStore.store,
        actions: appStore.actions
      },
      storeController: appStore.storeController
    };
  }
  appStore.initPrivate(store);
  return {
    storeType,
    store: {
      store: appStore.privateStore,
      actions: appStore.privateStoreActions
    },
    storeController: appStore.storeController
  };
}
