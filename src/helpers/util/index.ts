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
  _checkGroupStoreRootObject,
  _checkListenEvent,
  _checkNull,
  _checkOnEvent,
  _validateStore
} from "../developement";
import { checkReWriteStoreAndGetResult, createPath } from "../commonProdDev";
import { ObservableSet, ObservableMap } from "../observable";

function handleChanges(
  params: ChangeHandlerType,
  storeController: StoreController
) {
  const { event, state, key, value, action } = params;
  let next: (options: InterceptOptionsType) => void;
  if (params.action === "update") {
    next = (options: InterceptOptionsType) => {
      state[options.key] = assignObservableAndProxy(
        options.value,
        event,
        storeController
      );
    };
  } else {
    next = (options: InterceptOptionsType) => {
      delete state[options.key];
    };
  }
  storeController.handleDispatch(event, {
    value,
    key,
    state: removeObservableAndProxy(state),
    action: action,
    next
  });
}

function createProxyValidator(
  event: StringObjectType,
  storeController: StoreController
) {
  return {
    set: function (state: any, key: any, value: any) {
      if (!isSame(state[key], value)) {
        /* The correctEvent is find like this.
         * If event[key] exists, that means,
         * For ex: {data: {value: 10}} has a change in 'value', event will be {value: "data.value.data"}
         * Then event[key] exist and correctEvent with be "data.value.data".
         * If it doesn't exist we checked if some event is locked.
         * For example : {data: {value: []}}. Data is an array and the key of that array will be 0, 1 , 2 ...
         * event["0"] will never exist in that case. So we take the locked event which is lock to value. and we dispatch
         * 'data.value'.
         * Something for empty object
         * Ex: data = {};
         * then {}[someKey] doesn't exist so, we take the locked one.
         *
         * And now if the locked one doesn't exist also, like here, {}[key],
         * we take the key as event
         * */
        const correctEvent = event[key] ?? event.locked;
        handleChanges(
          { event: correctEvent ?? key, state, key, value, action: "update" },
          storeController
        );
      }
      return true;
    },
    deleteProperty: (target: any, prop: any) => {
      const correctEvent = event[prop] ?? event.locked;
      handleChanges(
        {
          event: correctEvent ?? prop,
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

/*
 * We create event with key and if you wonder why, it because of interceptor.
 * Without interceptors won't work as expected. Interceptor must intercept specific key
 * or all key if it is the user choice
 * */
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
  // console.log("entered with =>", event, helpers.rootEvent, typeof event);
  if (data && data.constructor.name === "Array") {
    /* Data is an array we locked the event
     * to array holder, ex: {arr: []}, we locked event to 'arr'.
     *  StoreController will always dispatch 'arr' for every action inside the array
     * */
    helpers.eventsObject.locked = event;
    return new Proxy(
      data,
      createProxyValidator(helpers.eventsObject, storeController)
    );
  }
  if (data && data.constructor.name === "Map") {
    // console.warn("locked map event", event);
    /*
     * Observables locked event themselves
     * */
    return handleObservable(
      data,
      new ObservableMap(storeController, event, true),
      "Map",
      event,
      storeController
    );
  }
  if (data && data.constructor.name === "Set") {
    // console.warn("locked set event", event);
    /*
     * Observables locked event themselves
     * */
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
       * Because every assignObservableAndProxy creates its own event, add it to eventsObject and pass it
       * to createProxyValidator.
       * We choose to use Object instead of an array, so when dispatching, we will just
       * dispatch the relevant key is the object, instead of filtering the array.
       *
       * eventsObject will contain possible event with the current key
       * */

      /*
       * We use lockEvent for Map or Set,
       * Let take this store: store = {data:{other: new Map(), value: 45}}.
       * Available target for the moment are
       * "data"
       * "data.other" // here other is a Map, but we cannot go inside that map for the moment.
       * "Data.value"
       * So when found an event for data.other.
       * We lock it and use it for any changes inside the Map
       * */

      /*
       * The value of helpers.rootEvent is preserved and only changed on next loop.
       * Because we do not override it.
       * We cannot just use event because we change event.
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
    /* Entries are empty so, we locked the event
     * to nothing or default value ''. StoreController will dispatch 'all' listener
     * */
    if (entries.length <= 0) {
      helpers.eventsObject.locked = event;
    }
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
  let storeType: string = GROUP;
  const STORE_KEYS = Object.keys(store);
  for (let i = 0; i < STORE_KEYS.length; i++) {
    if (typeof store[STORE_KEYS[i]] === "function") {
      storeType = SLICE;
      break;
    }
  }
  // we check if key in store is an object
  storeType === GROUP &&
    _checkGroupStoreRootObject &&
    _checkGroupStoreRootObject(store);

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

  if (storeKey === "_D") {
    return removeObservableAndProxy(store.store);
  }

  if (storeKey === "_A") {
    return store.actions;
  }

  if (paths[1] === "_A" && storeType === GROUP) {
    return isSnapShot ? store.actions : store.actions[storeKey];
  }

  if (paths[1] === "_D" && storeType === GROUP) {
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
    if (storeType === SLICE) {
      canSubscribe = firstKey !== "_A";
      event = firstKey ? (firstKey === "_D" ? ALL : firstKey) : ALL;
    }
    if (storeType === GROUP) {
      canSubscribe = firstKey !== "_A" && customGroupPath !== "_A";
      event = firstKey
        ? customGroupPath === "_D" || firstKey === "_D"
          ? ALL
          : firstKey
        : ALL;
    }
  }
  if (eventType === INTERCEPTION) {
    if (storeType === SLICE) {
      canSubscribe = firstKey !== "_A";
      event = firstKey === "_D" ? ALL : (target as string);
    }
    if (storeType === GROUP) {
      canSubscribe = firstKey !== "_A" && customGroupPath !== "_A";
      event =
        customGroupPath === "_D" || firstKey === "_D"
          ? ALL
          : (target as string);
    }
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
    _checkOnEvent && _checkOnEvent(event, callback);
    return sendDataWithMemo(undefined, callback, storeParams);
  };
  store.listen = function (event: string, callback: any) {
    _checkListenEvent &&
      _checkListenEvent(event, callback, storeParams, SUBSCRIPTION);
    return sendDataWithMemo(event, callback, storeParams);
  };
  store.intercept = function (event: string, callback: any) {
    _checkListenEvent &&
      _checkListenEvent(event, callback, storeParams, INTERCEPTION);
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
    _checkNull && _checkNull(event);
    const paths = storeParams.storeType === GROUP ? ["", "_A"] : ["_A"];
    return getData(paths, storeParams, true);
  };
  store.getDataSnapshot = function (event?: string) {
    _checkNull && _checkNull(event);
    const paths = storeParams.storeType === GROUP ? ["", "_D"] : ["_D"];
    return getData(paths, storeParams, true);
  };
  store.getSnapshot = function (event?: string) {
    _checkNull && _checkNull(event);
    return getData([], storeParams, true);
  };
  return store;
}

export function finalizeStore(store: any, storeParams: StoreParamsType) {
  return attachEvent(attachSnapshotHandler(store, storeParams), storeParams);
}

export function getNewStore<S>(store: S): StoreParamsType {
  //_warnProdNodeENV && _warnProdNodeENV();
  _validateStore && _validateStore(store);
  const storeType = getStoreType(store);
  const appStore = new Store();
  if (storeType === GROUP) {
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
