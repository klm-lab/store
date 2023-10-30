import type { FunctionType, SubscribeType } from "../types";

const O = Object;

class M extends Map {
  // e is event
  private readonly e: string;
  // 'i' is init to avoid dispatch on init
  private i: boolean;
  // C is changes in the store
  private readonly c: Set<string>;
  private readonly a: FunctionType;

  constructor(changes: Set<string>, event: string, init: boolean) {
    super();
    this.e = event;
    this.i = init;
    this.c = changes;
    this.a = () => !this.i && changes.add(event);
  }

  // n is a method to signal the end of initialisation
  n() {
    this.i = false;
  }

  set(key: any, value: any) {
    super.set(key, proxy(value, `${this.e}`, this.c, true));
    this.a();
    return this;
  }

  clear() {
    super.clear();
    this.a();
  }

  delete(key: any) {
    super.delete(key);
    this.a();
    return true;
  }
}

class Se extends Set {
  private readonly e: string;
  private i: boolean;
  private readonly c: Set<string>;
  private readonly a: FunctionType;

  constructor(changes: Set<string>, event: string, init: boolean) {
    super();
    this.e = event;
    this.i = init;
    this.c = changes;
    this.a = () => !this.i && changes.add(event);
  }

  n() {
    this.i = false;
  }

  add(value: any) {
    super.add(proxy(value, this.e, this.c, true));
    this.a();
    return this;
  }

  clear() {
    super.clear();
    this.a();
  }

  delete(value: any) {
    super.delete(value);
    this.a();
    return true;
  }
}

// Sync removes the proxy
const sync = (data: any): any => {
  if (data instanceof Array) {
    return data.map(sync);
  }
  if (data instanceof Map || data instanceof Set) {
    return spy(data, data instanceof Map ? Map : Set, null, null);
  }
  if (data?.constructor?.name === "Object") {
    const entries: any = O.entries(O.assign({}, data)).map(([key, value]) => {
      return [key, sync(value)];
    });
    return O.fromEntries(entries);
  }
  return data;
};

/**
 * Spy will track activity on a Mp or a Set if changes is passed, otherwise,
 * it will remove tracker from Map or Set.
 * If user has a Map in the store, we recreate A trackable Map to be able to listen to
 * changes, And when syncing, we recreate Built-int default Map.
 * @param {M | Se | Map<any, any> | Set<any>} data . The user data
 * @param {M | Se | Map<any, any> | Set<any>} Spy Our target data, can be a trackable or built-in Map or Set
 * @param {string | null} event  The event to dispatch
 * @param {Set<string> | null} changes to set changes in Map or Set. It can be null if we are syncing
 * @return {Map<any, any> | Set<any>} A trackable or built-in Map or Set
 */
const spy = (
  data: M | Se | Map<any, any> | Set<any>,
  Spy: any,
  event: string | null,
  changes: Set<string> | null
): M | Se | Map<any, any> | Set<any> => {
  const s = new Spy(changes, event, !!changes);
  data.forEach((v: any, k: any) => {
    if (s instanceof Map) {
      s.set(k, event ? changes && v : sync(v));
    } else {
      s.add(event ? changes && v : sync(v));
    }
  });
  s.n && s.n();
  return s;
};

const trap = (event: any, changes: Set<string>) => {
  return {
    set: (state: any, key: any, value: any) => {
      /* The correctEvent is find like this. Please, note l as locked
       * If event[key] exists, that means,
       * For ex: {data: {value: 10}} has a change in 'value', event will be {value: "data"}
       * Then event[key] exist and correctEvent with be "data".
       * If it doesn't exist, we checked if some event is locked.
       * For example : {data: {value: []}}. Data is an array and the key of that array will be 0, 1, 2 ...
       * event["0"] will never exist in that case. So we take the locked event which is lock to value. and we dispatch
       * 'value'.
       * Something for empty object
       * Ex: data = {};
       * then {}[someKey] doesn't exist, so, we take the locked one.
       *
       * And now if the locked one doesn't exist also, like here, {}[key],
       * we take the key as event
       * */
      const correctEvent = event[key] ?? event.l ?? key;
      state[key] = proxy(value, correctEvent, changes);
      changes.add(correctEvent);
      return true;
    },
    deleteProperty: (target: any, prop: any) => {
      delete target[prop];
      changes.add(event[prop] ?? event.l ?? prop);
      return true;
    }
  };
};

const proxy = (
  data: any,
  event: string,
  changes: Set<string>,
  lock = false,
  // helpers
  init = event,
  helper = {} as any
): any => {
  // console.log("entered with =>", event, helpers.rootEvent, typeof event);
  if (data instanceof Array) {
    helper.l = event;
    return new Proxy(
      data.map((value) => proxy(value, event, changes, true)),
      trap(helper, changes)
    );
  }

  if (data instanceof Map || data instanceof Set) {
    // console.warn("locked map event", event);
    return spy(data, data instanceof Map ? M : Se, event, changes);
  }

  /* We use constructor here because, Pretty many things are instance of Object in javascript
   * We need to be sure that it is an Object
   * */
  if (data?.constructor?.name === "Object") {
    const entries: any = O.entries(data).map(([key, value]) => {
      if (!lock) {
        event = init !== "" ? init : key;
        helper[key] = event;
      } else {
        helper[key] = event;
      }
      return [key, proxy(value, event, changes, lock)];
    });
    helper.l = event;
    return new Proxy(O.fromEntries(entries), trap(helper, changes));
  }
  return data;
};

const init = (store: any, fn?: FunctionType) => {
  const changes: Set<string> = new Set();
  const draft = proxy(store, "", changes);
  const signals: SubscribeType = {};

  const set = (callback: FunctionType) => {
    callback(draft);
    changes.add("*");
    // Syncing the store
    store = sync(draft);
    // Dispatch all changes
    changes.forEach((change) => {
      // Change may be valid with no subscribers
      if (change in signals) {
        // Call listeners relative to the change if someone subscribes
        signals[change].forEach((listener: FunctionType) => listener());
      }
    });
    // Clear all changes
    changes.clear();
  };

  const vGet = (target: string = "*") => get(target, sync(draft));

  const get = (target: string, data: any) => {
    target.split(".").forEach((p: string) => {
      data = target === "*" ? data : data ? data[p] : data;
    });
    return data;
  };

  const sub = (event: string = "*", listener: FunctionType) => {
    const key = event.split(".")[0];
    if (!(key in signals)) {
      signals[key] = new Set();
    }
    signals[key].add(listener);
    return () => {
      signals[key].delete(listener);
    };
  };

  const listen = (target: string, callback: FunctionType) => {
    return sub(target, () => {
      callback(vGet(target));
    });
  };

  const output = (target?: string) =>
    fn
      ? fn({ get: (target: string = "*") => get(target, store), sub }, target)
      : vGet(target);
  output.get = vGet;
  output.set = set;
  output.listen = listen;
  return output;
};

export { init };
