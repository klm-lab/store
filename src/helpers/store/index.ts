import { assignObservableAndProxy } from "../tools";
import {
  GROUP_STORE_EVENT,
  PRIVATE_STORE_EVENT
} from "../../constants/internal";

class StoreController {
  readonly #events: any;

  constructor() {
    this.#events = {};
  }

  subscribe(event: string, listener: any) {
    if (!(event in this.#events)) {
      this.#events[event] = new Set();
    }
    this.#events[event].add(listener);
    return () => this.unsubscribe(event, listener);
  }

  unsubscribe(event: string, listener: any) {
    if (event in this.#events) {
      this.#events[event].delete(listener);
    }
  }

  dispatch(event: string) {
    /* We check if someone subscribe to group event and if current event is not privateEvent.
     * If so, we call all group listener else, we do nothing
     * */
    if (GROUP_STORE_EVENT in this.#events && event !== PRIVATE_STORE_EVENT) {
      this.#events[GROUP_STORE_EVENT].forEach((listener: any) => listener());
    }

    if (!(event in this.#events)) {
      return;
    }
    /*
     * We call the event listener
     * */
    this.#events[event].forEach((listener: any) => listener());
  }
}

class Store {
  private readonly _store: any;
  private readonly _storeController: StoreController;
  private _privateStore: any;
  private _privateStoreActions: any;
  private readonly _actionsStore: any;

  constructor() {
    this._storeController = new StoreController();
    this._store = {};
    this._privateStore = {};
    this._privateStoreActions = {};
    this._actionsStore = {};
    this.init = this.init.bind(this);
    this.separateActionsAndData = this.separateActionsAndData.bind(this);
  }

  get storeController() {
    return this._storeController;
  }

  get store() {
    return this._store;
  }

  get privateStore() {
    return this._privateStore;
  }

  get privateStoreActions() {
    return this._privateStoreActions;
  }

  get actions() {
    return this._actionsStore;
  }

  private separateActionsAndData(slice: any) {
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

  init(userStore: any) {
    for (const userStoreKey in userStore) {
      // we get a slice ex: we get test from {test: any, other: any}
      const slice = userStore[userStoreKey];
      /*
       * Because, data not followed a passing rules. We need
       * to separate actions from data first
       * */
      const { store, actions } = this.separateActionsAndData(slice);
      this._store[userStoreKey] = store;
      this._actionsStore[userStoreKey] = actions;

      // We create proxy for every stored data
      this._store[userStoreKey] = assignObservableAndProxy(
        this._store[userStoreKey],
        userStoreKey,
        this._storeController
      );
      // We check if an action is present
      if (this._actionsStore[userStoreKey]) {
        // We get the slice actions: EX: test actions in store {test: {someAction: ()=> ...}.other: {someAction: () => ...}}
        const actionsSlice = this._actionsStore[userStoreKey];
        // we get the data with proxy of currentKey
        const sliceData = this._store[userStoreKey];
        /* We recreate actions passing proxy data
         * There is no need to apply proxy on actions. That why we do this in a separate loop
         * We also add chaining actions. So user can do actions().actions()....
         */
        for (const key in actionsSlice) {
          // This the action define by the user
          const userFunction = actionsSlice[key];
          //Now we recreate actions and passing data to be updated and all other user params
          this._actionsStore[userStoreKey][key] = function (...values: any) {
            userFunction(sliceData, ...values);
            return actionsSlice;
          };
        }
      }
    }
  }

  initPrivate(params: any) {
    /*
     * Because, data not followed a passing rules. We need
     * to separate actions from data first
     * */
    const { store, actions } = this.separateActionsAndData(params);
    this._privateStore = store;
    this._privateStoreActions = actions;

    // We create proxy with the store
    this._privateStore = assignObservableAndProxy(
      this._privateStore,
      PRIVATE_STORE_EVENT,
      this._storeController
    );
    /* We recreate actions passing proxy data
     * We can not do it in one loop . Because, there is no need to apply proxy on actions.
     * We also add chaining actions. So user can do actions().actions()....
     * */
    for (const key in this._privateStoreActions) {
      const element = this._privateStoreActions[key];
      // For 'this.' issue, we save the store and actions and pass it down
      const sliceData = this._privateStore;
      const actions = this._privateStoreActions;
      this._privateStoreActions[key] = function (...values: any) {
        element(sliceData, ...values);
        return actions;
      };
    }
  }
}

export { Store, StoreController };
