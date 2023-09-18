import { createProxy, removeProxy } from "../util";
import type { SubscribeType } from "../types";

class InternalStore {
  private _store: any;
  private _proxyStore: any;
  private readonly _storeActions: any;
  readonly #events: SubscribeType;
  readonly #allListeners: Set<any>;

  constructor() {
    this._store = {};
    this._proxyStore = {};
    this._storeActions = {};
    this.dispatch = this.dispatch.bind(this);
    this.#events = {};
    this.#allListeners = new Set();
  }

  get store() {
    return this._store;
  }

  get storeActions() {
    return this._storeActions;
  }

  init(userStore: any) {
    /*
     * We do not want to create proxy with functions.
     * So we separate actions from data first
     * */
    for (const key in userStore) {
      if (typeof userStore[key] === "function") {
        this._storeActions[key] = (...values: unknown[]) => {
          userStore[key](this._proxyStore, ...values);
          return this._storeActions;
        };
      } else {
        this._store[key] = userStore[key];
      }
    }
    // We create a proxy with the store
    this._proxyStore = createProxy(this._store, "", this.dispatch);
    return this;
  }

  subscribe(event: string, listener: any) {
    const registeredEvent = event.split(".")[0];
    if (event === "*") {
      this.#allListeners.add(listener);
      return () => this.#allListeners.delete(listener);
    }
    if (!(registeredEvent in this.#events)) {
      // Collection doesn't exist with this specific event. We create it
      this.#events[registeredEvent] = new Set();
    }
    // We add the listener to the specific event collection
    this.#events[registeredEvent].add(listener);
    return () => {
      // We delete the listener from the specific event collection
      this.#events[registeredEvent].delete(listener);
    };
  }

  dispatch(event: string) {
    // Syncing the store
    this._store = removeProxy(this._proxyStore);
    // we get the rootKey as event
    const registeredEvent = event.split(".")[0];
    //Call all 'ALL' listeners if they are present
    this.#allListeners.forEach((listener: any) => listener());
    // Dispatching an event that maybe is valid and exist but with no subscribers
    if (!(registeredEvent in this.#events)) {
      return;
    }
    // Call listeners relative to the event if someone subscribes
    this.#events[registeredEvent].forEach((listener: any) => listener());
  }
}

export { InternalStore };
