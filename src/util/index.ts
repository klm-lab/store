import type { InternalStore } from "../store";
import { SpySet, SpyMap } from "../spy";
import type { DispatchType } from "../types";

const proxyTrap = (event: any, dispatch: DispatchType) => {
  return {
    set: (state: any, key: any, value: any) => {
      if (state[key] !== value) {
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
        state[key] = createProxy(value, correctEvent, dispatch);
        dispatch(correctEvent);
      }
      return true;
    },
    deleteProperty: (target: any, prop: any) => {
      delete target[prop];
      dispatch(event[prop] ?? event.locked ?? prop);
      return true;
    }
  };
};

const spyMapSet = (
  data: any,
  Spy: any,
  event: string | null,
  dispatch: DispatchType | null
) => {
  const obs = new Spy(dispatch, event, !!dispatch);
  data.forEach((v: any, k: any) => {
    if (obs instanceof Map) {
      obs.set(k, event ? dispatch && v : removeProxy(v));
    } else {
      obs.add(event ? dispatch && v : removeProxy(v));
    }
  });
  obs.end && obs.end();
  return obs;
};

export function createProxy(
  data: any,
  event: string,
  dispatch: DispatchType,
  // helpers
  lock = false,
  init = event,
  finalEvent = {} as any
) {
  // console.log("entered with =>", event, helpers.rootEvent, typeof event);
  if (data instanceof Array) {
    finalEvent.locked = event;
    return new Proxy(data, proxyTrap(finalEvent, dispatch));
  }
  if (data instanceof Map || data instanceof Set) {
    // console.warn("locked map event", event);
    return spyMapSet(
      data,
      data instanceof Map ? SpyMap : SpySet,
      event,
      dispatch
    );
  }
  if (data instanceof Object) {
    const entries: any = Object.entries(data).map(([key, value]) => {
      if (!lock) {
        event = init !== "" ? `${init}` : `${key}`;
        // console.log("creating event =>", event, helper.events);
        finalEvent[key] = event;
      } else {
        finalEvent[key] = event;
      }
      return [key, createProxy(value, event, dispatch, lock)];
    });

    return new Proxy(
      Object.fromEntries(entries),
      proxyTrap(finalEvent, dispatch)
    );
  }
  return data;
}

export function removeProxy(data: any): any {
  if (data instanceof Array) {
    return data.map(removeProxy);
  }
  if (data instanceof Map || data instanceof Set) {
    return spyMapSet(data, data instanceof Map ? Map : Set, null, null);
  }
  if (data instanceof Object) {
    const entries: any = Object.entries(Object.assign({}, data)).map(
      ([key, value]) => {
        return [key, removeProxy(value)];
      }
    );
    return Object.fromEntries(entries);
  }
  return data;
}
export const finalize = (userStore: any, internalStore: InternalStore) => {
  userStore.dispatcher = internalStore.storeActions;
  // attaching snapshot
  userStore.getSnapshot = (target?: string) => getData(internalStore, target);
  // attaching listener
  userStore.listen = (event: string, callback: any) => {
    let cache = getData(internalStore, event);
    return internalStore.subscribe(event, () => {
      const data = getData(internalStore, event);
      if (cache !== data) {
        cache = data;
        callback(cache);
      }
    });
  };
  return userStore;
};

export function getData(internalStore: InternalStore, target?: string) {
  const paths = target ? (target === "*" ? [] : target.split(".")) : [];
  let result = internalStore.store;
  paths.forEach((p) => {
    result = result ? result[p] : result;
  });
  return result;
}
