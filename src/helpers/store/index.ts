import { assignObservableAndProxy, removeObservableAndProxy } from "../util";
import type { SubscribeType } from "../../types";

class InternalStore {
  private _store: any;
  private _proxyStore: any;
  private _storeActions: any;
  readonly #events: SubscribeType;
  readonly #allListeners: Set<any>;

  constructor() {
    this._store = {};
    this._proxyStore = {};
    this._storeActions = {};
    this.init = this.init.bind(this);
    this.dispatch = this.dispatch.bind(this);
    this.getStore = this.getStore.bind(this);
    this.getActions = this.getActions.bind(this);
    this.#events = {};
    this.#allListeners = new Set();
  }

  getStore() {
    return this._store;
  }

  getActions() {
    return this._storeActions;
  }

  #syncStore() {
    this._store = removeObservableAndProxy(this._proxyStore);
  }

  #separateActionsAndData(userStore: any) {
    const store: any = {};
    const actions: any = {};
    // we loop through userStore and separate data and actions
    for (const key in userStore) {
      const sliceData = userStore[key];
      if (typeof sliceData === "function") {
        //We got a function here. We add it to our storeActions
        actions[key] = sliceData;
      } else {
        store[key] = sliceData;
      }
    }
    return { store, actions };
  }

  init(userStore: any) {
    this.#initStore(userStore);
    return this;
  }

  #initStore(params: any) {
    /*
     * We do not want to create proxy with functions.
     * So we separate actions from data first
     * */
    const { store, actions } = this.#separateActionsAndData(params);
    this._store = store;
    this._storeActions = actions;

    // We create a proxy with the store
    this._proxyStore = assignObservableAndProxy(this._store, "", this.dispatch);
    /* We recreate actions passing proxy data
     * We cannot do it in one loop.
     * Because there is no need to apply proxy on actions.
     * We also add chaining actions.
     * So user can do actions().actions()....
     * */
    for (const key in this._storeActions) {
      const element = this._storeActions[key];
      this._storeActions[key] = (...values: unknown[]) => {
        element(this._proxyStore, ...values);
        return this._storeActions;
      };
    }
  }

  subscribe(event: string, listener: any) {
    return this.#handleSubscribe(event, listener);
  }

  #handleSubscribe(event: string, listener: any) {
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
    this.#syncStore();
    // we get the rootKey as event
    const registeredEvent = event.split(".")[0];
    //Call all 'ALL' listeners if they are present
    if (this.#allListeners.size > 0) {
      this.#allListeners.forEach((listener: any) => listener());
    }
    // Dispatching an event that maybe is valid and exist but with no subscribers
    if (!(registeredEvent in this.#events)) {
      return;
    }
    // Call listeners relative to the event if someone subscribes
    this.#events[registeredEvent].forEach((listener: any) => listener());
  }
}

export { InternalStore };
