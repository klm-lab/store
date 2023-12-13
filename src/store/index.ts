import type { FunctionType, StoreType, Unknow } from "../types";

const O = Object;
const entries = O.entries;
const fromEntries = O.fromEntries;

const isObject = (data: Unknow) => data?.constructor?.name === "Object";
// Sync removes the proxy
const sync = (data: Unknow): Unknow => {
  if (data instanceof Array) {
    return data.map(sync);
  }
  if (data instanceof Map) {
    return new Map(data);
  }
  if (data instanceof Set) {
    return new Set(data);
  }
  if (isObject(data)) {
    const ent = entries(O.assign({}, data)).map(([key, value]) => {
      return [key, sync(value)];
    });
    return fromEntries(ent);
  }
  return data;
};

const trap = () => {
  return {
    set: (state: Unknow, key: Unknow, value: Unknow) => {
      state[key] = proxy(value);
      return true;
    },
    deleteProperty: (target: Unknow, prop: Unknow) => {
      delete target[prop];
      return true;
    }
  };
};

const proxy = (data: Unknow): Unknow => {
  // console.log("entered with =>", event, helpers.rootEvent, typeof event);
  if (data instanceof Array) {
    return new Proxy(data.map(proxy), trap());
  }
  /* We use constructor here because, Pretty many things are instance of Object in javascript
   * We need to be sure that it is an Object
   * */
  if (isObject(data)) {
    const ent = entries(data).map(([key, value]) => {
      return [key, proxy(value)];
    });
    return new Proxy(fromEntries(ent), trap());
  }
  return data;
};

const init = <S>(store: S, fn?: FunctionType): StoreType<S> => {
  const draft = proxy(store);
  const cb = new Set<FunctionType>();
  let selectorCache: Unknow = {};

  const set = (callback: FunctionType) => {
    callback(draft);
    // Syncing the store
    store = sync(draft);
    selectorCache = {};
    // Dispatch all changes
    cb.forEach((listener: FunctionType) => listener());
  };

  const vGet = (target: Unknow = "*") => get(target, sync(draft));

  const get = (target: Unknow, data: Unknow) => {
    if (target.call) {
      if (!selectorCache[target]) {
        selectorCache[target] = target(data);
      }
      return selectorCache[target];
    }
    target.split(".").forEach((p: string) => {
      data = target === "*" ? data : data ? data[p] : data;
    });
    return data;
  };

  const sub = (listener: FunctionType) => {
    cb.add(listener);
    return () => {
      cb.delete(listener);
    };
  };

  const listen = (target: string, callback: FunctionType) => {
    let cache = vGet(target);
    return sub(() => {
      const value = vGet(target);
      if (value !== cache) {
        callback(value);
        cache = value;
      }
    });
  };

  const output = (target?: string) =>
    fn
      ? fn((target: Unknow = "*") => get(target, store), sub, target)
      : vGet(target);
  output.get = vGet;
  output.set = set;
  output.listen = listen;
  return output;
};
export { init as createStore };
