import type { FunctionType, SubscribeType } from "../types";

const proxyTrap = (event: any, signals: any) => {
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
        state[key] = createProxy(value, correctEvent, signals);
        signals.add(correctEvent);
      }
      return true;
    },
    deleteProperty: (target: any, prop: any) => {
      delete target[prop];
      signals.add(event[prop] ?? event.locked ?? prop);
      return true;
    }
  };
};

const createProxy = (
  data: any,
  event: string,
  signals: Set<string>,
  lock = false,
  // helpers
  init = event,
  finalEvent = {} as any
): any => {
  // console.log("entered with =>", event, helpers.rootEvent, typeof event);
  if (data instanceof Array) {
    finalEvent.locked = event;
    return new Proxy(
      data.map((value) => createProxy(value, event, signals, true)),
      proxyTrap(finalEvent, signals)
    );
  }
  /* We use constructor here because, Pretty many things are instance of Object in javascript
   * We need to be sure that it is an Object
   * */
  if (data?.constructor?.name === "Object") {
    const entries: any = Object.entries(data).map(([key, value]) => {
      if (!lock) {
        event = init !== "" ? `${init}` : `${key}`;
        finalEvent[key] = event;
      } else {
        finalEvent[key] = event;
      }
      return [key, createProxy(value, event, signals, lock)];
    });
    return new Proxy(
      Object.fromEntries(entries),
      proxyTrap(finalEvent, signals)
    );
  }
  return data;
};

function removeProxy(data: any): any {
  if (data instanceof Array) {
    return data.map(removeProxy);
  }
  if (data?.constructor?.name === "Object") {
    const entries: any = Object.entries(Object.assign({}, data)).map(
      ([key, value]) => {
        return [key, removeProxy(value)];
      }
    );
    return Object.fromEntries(entries);
  }
  return data;
}

function init(store: any, fn?: FunctionType) {
  const changes: Set<string> = new Set();
  const proxy = createProxy(store, "", changes);
  const signals: SubscribeType = {};
  const allListeners: Set<FunctionType> = new Set();

  const dispatch = () => {
    // Syncing the store
    store = removeProxy(proxy);
    //Call all 'ALL' listeners if they are present
    allListeners.forEach((listener: FunctionType) => listener());
    // Dispatch all changes
    changes.forEach((change) => {
      // Change that maybe is valid and exists with no subscribers
      if (!(change in signals)) {
        return;
      }
      // Call listeners relative to the change if someone subscribes
      signals[change].forEach((listener: FunctionType) => listener());
    });
    // Clear all changes
    changes.clear();
  };
  const set = (callback: FunctionType) => {
    callback(proxy);
    dispatch();
    return { set };
  };

  const get = (target?: string) => {
    const paths = target ? (target === "*" ? [] : target.split(".")) : [];
    let result = store;
    paths.forEach((p: string) => {
      result = result ? result[p] : result;
    });
    return result;
  };

  const subscribe = (event: string, listener: FunctionType) => {
    const key = event.split(".")[0];
    if (event === "*") {
      allListeners.add(listener);
      return () => allListeners.delete(listener);
    }
    if (!(key in signals)) {
      signals[key] = new Set();
    }
    signals[key].add(listener);
    return () => {
      signals[key].delete(listener);
    };
  };

  const listen = (target: string, callback: FunctionType) => {
    let cache = get(target);
    return subscribe(target, () => {
      const data = get(target);
      if (cache !== data) {
        cache = data;
        callback(cache);
      }
    });
  };

  if (fn) {
    const output = (target?: string) => fn({ get, subscribe }, target);
    output.get = get;
    output.set = set;
    output.listen = listen;
    return output;
  }
  const output = (target?: string) => get(target);
  output.get = get;
  output.set = set;
  output.listen = listen;
  return output;
}

export { init };
