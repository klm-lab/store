import type { InternalStore } from "../store";
import { ObservableSet, ObservableMap } from "../observable";
import type { DispatchType } from "../../types";

const createProxyValidator = (event: any, dispatch: DispatchType) => {
  return {
    set: (state: any, key: any, value: any) => {
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
        const correctEvent = event[key] ?? event.locked ?? key;
        state[key] = assignObservableAndProxy(value, correctEvent, dispatch);
        dispatch(correctEvent);
      }
      return true;
    },
    deleteProperty: (target: any, prop: any) => {
      const correctEvent = event[prop] ?? event.locked ?? prop;
      delete target[prop];
      dispatch(correctEvent);
      return true;
    }
  };
};

const handleObservable = (
  data: any,
  element: any,
  type: string,
  event: string | null,
  dispatch: DispatchType | null
) => {
  data.forEach((v: any, k: any) => {
    if (type === "Map") {
      element.set(k, event ? dispatch && v : removeObservableAndProxy(v));
    }
    if (type === "Set") {
      element.add(event ? dispatch && v : removeObservableAndProxy(v));
    }
  });
  element.finishInit && element.finishInit();
  return element;
};

export function assignObservableAndProxy(
  data: any,
  event: string,
  dispatch: DispatchType,
  lockEvent = false,
  helper = {
    rootEvent: event,
    eventsObject: {} as any
  }
) {
  // console.log("entered with =>", event, helpers.rootEvent, typeof event);
  if (data && data.constructor.name === "Array") {
    helper.eventsObject.locked = event;
    return new Proxy(data, createProxyValidator(helper.eventsObject, dispatch));
  }
  if (data && data.constructor.name === "Map") {
    // console.warn("locked map event", event);
    /*
     * Observables locked event themselves
     * */
    return handleObservable(
      data,
      new ObservableMap(dispatch, event, true),
      "Map",
      event,
      dispatch
    );
  }
  if (data && data.constructor.name === "Set") {
    // console.warn("locked set event", event);
    /*
     * Observables locked event themselves
     * */
    return handleObservable(
      data,
      new ObservableSet(dispatch, event, true),
      "Set",
      event,
      dispatch
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
      return [key, assignObservableAndProxy(value, event, dispatch, lockEvent)];
    });

    return new Proxy(
      Object.fromEntries(entries),
      createProxyValidator(helper.eventsObject, dispatch)
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

export const finalizeStore = (userStore: any, internalStore: InternalStore) => {
  userStore.dispatcher = internalStore.getActions();
  userStore.getActions = internalStore.getActions;
  // attaching snapshot
  userStore.getSnapshot = (target?: string) => getData(internalStore, target);
  // attaching listener
  userStore.listen = (event: string, callback: any) => {
    let snapShot = getData(internalStore, event);
    return internalStore.subscribe(event, () => {
      const newData = getData(internalStore, event);
      if (!isSame(snapShot, newData)) {
        snapShot = newData;
        callback(snapShot);
      }
    });
  };
  return userStore;
};

export function getData(internalStore: InternalStore, target?: string) {
  const paths = target ? (target === "*" ? [] : target.split(".")) : [];
  let result = internalStore.getStore();
  paths.forEach((p) => {
    result = result ? result[p] : result;
  });
  return result;
}
