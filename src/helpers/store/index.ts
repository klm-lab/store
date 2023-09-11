import { assignObservableAndProxy } from "../util";
import { StoreController } from "./controller";

class Store {
  private readonly _store: any;
  private readonly _StoreActions: any;
  private readonly _storeController: StoreController;
  private _privateStore: any;
  private _privateStoreActions: any;

  constructor() {
    this._storeController = new StoreController();
    this._store = {};
    this._privateStore = {};
    this._privateStoreActions = {};
    this._StoreActions = {};
    this.init = this.init.bind(this);
    this.initPrivate = this.initPrivate.bind(this);
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
    return this._StoreActions;
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

  init(userStore: any) {
    this.#groupInit(userStore);
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
      this._StoreActions[userStoreKey] = actions;

      // We create a proxy for every stored data
      this._store[userStoreKey] = assignObservableAndProxy(
        this._store[userStoreKey],
        userStoreKey,
        this._storeController
      );
      // We check if an action is present
      if (this._StoreActions[userStoreKey]) {
        // We get the slice actions: EX: test actions in store {test: {someAction: ()=> ...}.other: {someAction: () => ...}}
        const actionsSlice = this._StoreActions[userStoreKey];
        /* We recreate actions passing proxy data
         * There is no need to apply proxy on actions. That why we do this in a separate loop
         * We also add chaining actions. So user can do actions().actions()....
         */
        for (const key in actionsSlice) {
          // This the action define by the user
          const userFunction = actionsSlice[key];
          //Now we recreate actions and passing data to be updated and all other user params
          this._StoreActions[userStoreKey][key] = (...values: any) => {
            userFunction(this._store[userStoreKey], ...values);
            return actionsSlice;
          };
        }
      }
    }
    this._storeController.createStoreEvent(this._store, "");
  }

  initPrivate(params: any) {
    this.#sliceInit(params);
  }

  #sliceInit(params: any) {
    /*
     * Because, data didn't follow a passing rules. We need
     * to separate actions from data first
     * */
    const { store, actions } = this.#separateActionsAndData(params);
    this._privateStore = store;
    this._privateStoreActions = actions;

    // We create a proxy with the store
    this._privateStore = assignObservableAndProxy(
      this._privateStore,
      "",
      this._storeController
    );
    /* We recreate actions passing proxy data
     * We cannot do it in one loop.
     * Because there is no need to apply proxy on actions.
     * We also add chaining actions.
     * So user can do actions().actions()....
     * */
    for (const key in this._privateStoreActions) {
      const element = this._privateStoreActions[key];
      const actions = this._privateStoreActions;
      this._privateStoreActions[key] = (...values: any) => {
        element(this._privateStore, ...values);
        return actions;
      };
    }
    this._storeController.createStoreEvent(this._privateStore, "");
  }
}

export { Store, StoreController };
