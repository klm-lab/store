import type { EqualityCheck, FunctionType, StoreType, Unknown } from "../types";

const O = Object;
const entries = O.entries;
const fromEntries = O.fromEntries;

const isObject = (data: Unknown) => data?.constructor?.name === "Object";
// Sync removes the proxy
const sync = (data: Unknown): Unknown => {
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
    set: (state: Unknown, key: Unknown, value: Unknown) => {
      state[key] = proxy(value);
      return true;
    },
    deleteProperty: (target: Unknown, prop: Unknown) => {
      delete target[prop];
      return true;
    }
  };
};

const proxy = (data: Unknown): Unknown => {
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
  /* This selector cache is because of how react handles things,
   * To avoid unlimited render, we will the same cached value to react
   * The key of the cache is the target
   *  */
  let selectorCache: Unknown = {};
  /* This is for deep equality check if present, we track old value here
   * The key is the target
   * */
  const permanentCache: Unknown = {};

  const set = (callback: FunctionType) => {
    callback(draft);
    // clear selector cache because changes happen
    selectorCache = {};
    // Dispatch all changes
    cb.forEach((listener: FunctionType) => listener());
  };

  const getTargetData = (target: Unknown = "*", data: Unknown) => {
    if (!selectorCache[target]) {
      if (target?.call) {
        selectorCache[target] = target(data);
      } else {
        target.split(".").forEach((p: string) => {
          data = target === "*" ? data : data ? data[p] : data;
        });
        selectorCache[target] = data;
      }
    }
    return selectorCache[target];
  };
  const get = (target: Unknown, equalityCheck?: EqualityCheck<Unknown>) => {
    // We sync again because, for 'get' always send immutable data
    const newData = getTargetData(target, sync(draft));
    if (permanentCache[target]) {
      if (
        equalityCheck
          ? equalityCheck(permanentCache[target], newData)
          : permanentCache[target] !== newData
      ) {
        permanentCache[target] = newData;
      }
      return permanentCache[target];
    }
    permanentCache[target] = newData;
    return newData;
  };

  const sub = (listener: FunctionType) => {
    cb.add(listener);
    return () => {
      cb.delete(listener);
    };
  };

  const listen = (
    target: Unknown,
    callback: FunctionType,
    equalityCheck?: EqualityCheck<Unknown>
  ) => {
    let cache = getTargetData(target, sync(draft));
    return sub(() => {
      const newData = getTargetData(target, sync(draft));
      if (equalityCheck ? equalityCheck(cache, newData) : cache !== newData) {
        cache = newData;
        callback(cache);
      }
    });
  };

  const output = (target: Unknown, equalityCheck?: EqualityCheck<Unknown>) =>
    fn ? fn(() => get(target, equalityCheck), sub) : get(target);
  output.get = get;
  output.set = set;
  output.listen = listen;
  return output as StoreType<S>;
};
export { init as createStore };
