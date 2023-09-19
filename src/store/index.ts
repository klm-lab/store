import { createProxy, removeProxy } from "../util";
import type { FunctionType, SubscribeType } from "../types";

class Store {
  private _store: any;
  private _proxy: any;
  private readonly _actions: any;
  readonly #events: SubscribeType;
  readonly #allListeners: Set<any>;

  constructor() {
    this._store = {};
    this._proxy = {};
    this._actions = {};
    this.dispatch = this.dispatch.bind(this);
    this.getData = this.getData.bind(this);
    this.#events = {};
    this.#allListeners = new Set();
  }

  get actions() {
    return this._actions;
  }

  getData(target?: string) {
    const paths = target ? (target === "*" ? [] : target.split(".")) : [];
    let result = this._store;
    paths.forEach((p: any) => {
      result = result ? result[p] : result;
    });
    return result;
  }

  init(userStore: any) {
    /*
     * We do not want to create proxy with functions.
     * So we separate actions from data first
     * */
    for (const key in userStore) {
      if (typeof userStore[key] === "function") {
        this._actions[key] = (...values: unknown[]) => {
          userStore[key](this._proxy, ...values);
          return this._actions;
        };
      } else {
        this._store[key] = userStore[key];
      }
    }
    // We create a proxy with the store
    this._proxy = createProxy(this._store, "", this.dispatch);
    return this;
  }

  subscribe(event: string, listener: FunctionType) {
    const key = event.split(".")[0];
    if (event === "*") {
      this.#allListeners.add(listener);
      return () => this.#allListeners.delete(listener);
    }
    if (!(key in this.#events)) {
      this.#events[key] = new Set();
    }
    this.#events[key].add(listener);
    return () => {
      this.#events[key].delete(listener);
    };
  }

  dispatch(event: string) {
    // Syncing the store
    this._store = removeProxy(this._proxy);
    // we get the rootKey as event
    const registeredEvent = event.split(".")[0];
    //Call all 'ALL' listeners if they are present
    this.#allListeners.forEach((listener: any) => listener());
    // Dispatching an event that maybe is valid and exist but with no subscribers
    if (!(registeredEvent in this.#events)) {
      return;
    }
    // Call listeners relative to the event if someone subscribes
    this.#events[registeredEvent].forEach((listener: FunctionType) =>
      listener()
    );
  }
}

export { Store };
