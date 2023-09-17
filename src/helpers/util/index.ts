import { GROUP, SLICE } from "../../constants/internal";
import type {
  ChangeHandlerType,
  InterceptOptionsType,
  StoreParamsType,
  StoreType
} from "../../types";
import { Store, StoreController } from "../store";
import {
  _checkGroupStoreRootObject,
  _checkListenEvent,
  _validateStore
} from "../developement";
import { getData } from "../commonProdDev";
import { ObservableSet, ObservableMap } from "../observable";

function handleChanges(
  params: ChangeHandlerType,
  storeController: StoreController
) {
  const { event, state } = params;
  let next: (options: InterceptOptionsType) => void;
  if (params.action === "update") {
    next = (options: InterceptOptionsType) => {
      if (options.interceptorAction === "rejectAction") {
        state[params.key] = params.oldValue;
      } else {
        /* Maybe it is an override.
         * We restore old value
         * */
        state[params.key] = params.oldValue;
        // We execute interceptor decision
        state[options.key] = assignObservableAndProxy(
          options.value,
          event,
          storeController
        );
      }
    };
  } else {
    next = (options: InterceptOptionsType) => {
      if (options.interceptorAction === "rejectAction") {
        state[params.key] = params.oldValue;
      } else {
        console.log("ok", options.interceptorAction);
        /* Maybe it is an override.
         * We restore old value
         * */
        state[params.key] = params.oldValue;
        // We execute interceptor decision
        delete state[options.key];
      }
    };
  }
  storeController.handleDispatch({
    ...params,
    state: removeObservableAndProxy(state),
    next
  });
}

function createProxyValidator(event: any, storeController: StoreController) {
  return {
    set: function (state: any, key: any, value: any) {
      if (!isSame(state[key], value)) {
        /* The correctEvent is find like this.
         * If event[key] exists, that means,
         * For ex: {data: {value: 10}} has a change in 'value', event will be {value: "data.value.data"}
         * Then event[key] exist and correctEvent with be "data.value.data".
         * If it doesn't exist, we checked if some event is locked.
         * For example : {data: {value: []}}. Data is an array and the key of that array will be 0, 1, 2 ...
         * event["0"] will never exist in that case. So we take the locked event which is lock to value. and we dispatch
         * 'data.value'.
         * Something for empty object
         * Ex: data = {};
         * then {}[someKey] doesn't exist, so, we take the locked one.
         *
         * And now if the locked one doesn't exist also, like here, {}[key],
         * we take the key as event
         * */
        const generatedEvent = event[key] ?? event.locked;
        const correctEvent = generatedEvent ?? key;
        const oldValue = state[key];
        /* We removePRoxy here because, user can copy proxy data and send it here.
         * ex: store.data.deep = {
         *     ...store.data.deep,
         *       // users custom change
         * }
         * This will lead to the maximum call size error, exceeded. Assign proxy will be called again
         * and again and again
         */
        const newValue = removeObservableAndProxy(value);
        /* Temporary changes*/
        state[key] = newValue;
        /* Temporary changes*/

        handleChanges(
          {
            event: correctEvent,
            state,
            key,
            value: newValue,
            oldValue,
            action: "update",
            interceptorAction: "allowAction"
          },
          storeController
        );
      }
      return true;
    },
    deleteProperty: (target: any, prop: any) => {
      const generatedEvent = event[prop] ?? event.locked;
      const correctEvent = generatedEvent ?? prop;
      /* We keep old value as it is even if it is a proxy and will restore it
       * if an interceptor rejects the action.
       * */
      const oldValue = target[prop];
      // delete target[prop];
      handleChanges(
        {
          event: correctEvent,
          state: target,
          key: prop,
          value: null,
          oldValue,
          action: "delete",
          interceptorAction: "allowAction"
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
 * We create event with a key and if you wonder why, it because of interceptor.
 * Interceptors won't work as expected. Interceptor must intercept specific key
 * or all key if it is the user choice
 * */
export function assignObservableAndProxy(
  data: any,
  event: string,
  storeController: StoreController,
  lockEvent = false,
  helper = {
    rootEvent: event,
    eventsObject: {} as any
  }
) {
  // console.log("entered with =>", event, helpers.rootEvent, typeof event);
  if (data && data.constructor.name === "Array") {
    helper.eventsObject.locked = event;
    return new Proxy(
      data,
      createProxyValidator(helper.eventsObject, storeController)
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
        event = helper.rootEvent !== "" ? `${helper.rootEvent}` : `${key}`;
        // console.log("creating event =>", event, helper.eventsObject);
        helper.eventsObject[key] = event;
      } else {
        helper.eventsObject[key] = event;
      }
      return [
        key,
        assignObservableAndProxy(value, event, storeController, lockEvent)
      ];
    });

    return new Proxy(
      Object.fromEntries(entries),
      createProxyValidator(helper.eventsObject, storeController)
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

export function attachEvent(store: any, storeParams: StoreParamsType) {
  store.listen = (event: string, callback: any) => {
    _checkListenEvent && _checkListenEvent(event, callback, storeParams);
    let snapShot = getData(event, storeParams);
    return storeParams.storeController.subscribe(event, () => {
      const newData = getData(event, storeParams);
      if (!isSame(snapShot, newData)) {
        snapShot = newData;
        callback(snapShot);
      }
    });
  };
  store.intercept = (event: string, callback: any) => {
    _checkListenEvent && _checkListenEvent(event, callback, storeParams, true);
    return storeParams.storeController.registerInterceptor(event, callback);
  };
  return store;
}

export function finalizeStore(store: any, storeParams: StoreParamsType) {
  store.dispatcher = storeParams.store.getActions();
  store.getActions = storeParams.store.getActions;
  store.getSnapshot = (target?: string) => {
    return getData(target as string, storeParams);
  };
  return attachEvent(store, storeParams);
}

export function getNewStore<S>(store: S): StoreParamsType {
  //_warnProdNodeENV && _warnProdNodeENV();
  _validateStore && _validateStore(store);
  const storeType = getStoreType(store);
  const appStore = new Store();
  appStore.init(store, storeType);
  return {
    store: appStore,
    storeController: appStore.storeController
  };
}
