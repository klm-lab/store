import { assignObservableAndProxy, removeObservableAndProxy } from "../util";
import { StoreController } from "./controller";
import type { StoreType } from "../../types";
import { GROUP } from "../../constants/internal";

class InternalStore {
  private _store: any;
  private _proxyStore: any;
  private _storeActions: any;
  private readonly _storeController: StoreController;

  constructor() {
    this._store = {};
    this._proxyStore = {};
    this._storeActions = {};
    this.init = this.init.bind(this);
    this.updateStore = this.updateStore.bind(this);
    this.getStore = this.getStore.bind(this);
    this.getActions = this.getActions.bind(this);
    this._storeController = new StoreController(this.updateStore);
  }

  get storeController() {
    return this._storeController;
  }

  getStore() {
    return this._store;
  }

  getActions() {
    return this._storeActions;
  }

  updateStore() {
    this.#syncStore();
  }

  #syncStore() {
    this._store = removeObservableAndProxy(this._proxyStore);
  }

  #separateActionsAndData(slice: any) {
    const store: any = {};
    const actions: any = {};
    // we loop through slice (test) and separate data and actions
    for (const sliceKey in slice) {
      const sliceData = slice[sliceKey];
      if (typeof sliceData === "function") {
        //We got a function here. We add it to our storeActions
        actions[sliceKey] = sliceData;
      } else {
        store[sliceKey] = sliceData;
      }
    }
    return { store, actions };
  }

  init(userStore: any, storeType: StoreType) {
    this.#initStore(userStore, storeType);
    return this;
  }

  #initStore(userStore: any, storeType: StoreType) {
    if (storeType === GROUP) {
      this.#groupInit(userStore);
    } else {
      this.#sliceInit(userStore);
    }
  }

  #groupInit(userStore: any) {
    for (const userStoreKey in userStore) {
      // we get a slice ex: we get test from {test: any, other: any}
      const slice = userStore[userStoreKey];
      /*
       * Because, data didn't follow a passing rules. We need
       * to separate actions from data first
       * */
      const { store, actions } = this.#separateActionsAndData(slice);
      this._store[userStoreKey] = store;
      this._storeActions[userStoreKey] = actions;

      // We create a proxy for every stored data
      this._proxyStore[userStoreKey] = assignObservableAndProxy(
        this._store[userStoreKey],
        userStoreKey,
        this._storeController
      );
      // We check if an action is present
      if (this._storeActions[userStoreKey]) {
        // We get the slice actions: EX: test actions in store {test: {someAction: ()=> ...}.other: {someAction: () => ...}}
        const actionsSlice = this._storeActions[userStoreKey];
        /* We recreate actions passing proxy data
         * There is no need to apply proxy on actions. That why we do this in a separate loop
         * We also add chaining actions. So user can do actions().actions()....
         */
        for (const key in actionsSlice) {
          // This the action define by the user
          const userFunction = actionsSlice[key];
          //Now we recreate actions and passing data to be updated and all other user params
          this._storeActions[userStoreKey][key] = (...values: unknown[]) => {
            userFunction(this._proxyStore[userStoreKey], ...values);
            return actionsSlice;
          };
        }
      }
    }
  }

  #sliceInit(params: any) {
    /*
     * We do not want to create proxy with functions.
     * So we separate actions from data first
     * */
    const { store, actions } = this.#separateActionsAndData(params);
    this._store = store;
    this._storeActions = actions;

    // We create a proxy with the store
    this._proxyStore = assignObservableAndProxy(
      this._store,
      "",
      this._storeController
    );
    /* We recreate actions passing proxy data
     * We cannot do it in one loop.
     * Because there is no need to apply proxy on actions.
     * We also add chaining actions.
     * So user can do actions().actions()....
     * */
    for (const key in this._storeActions) {
      const element = this._storeActions[key];
      const actions = this._storeActions;
      this._storeActions[key] = (...values: any) => {
        element(this._proxyStore, ...values);
        return actions;
      };
    }
  }
}

export { InternalStore, StoreController };
