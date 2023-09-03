import { _UtilError } from "./helpers/error";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type {
  CreateStoreType,
  DefaultStoreOptionsType,
  StoreFunctionType,
  StoreParamsType,
  UserParamsType
} from "./types";
import {
  _checkStoreOptions,
  _validateStore,
  assignObservableAndProxy,
  isSame,
  removeObservableAndProxy,
  StoreController
} from "./helpers/tools";
import { GROUP_STORE_EVENT, PRIVATE_STORE_EVENT } from "./constants/internal";

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

function createStore<S, O extends DefaultStoreOptionsType>(
  store: S,
  storeOptions: O
): CreateStoreType<S, O>;
function createStore<S, O extends DefaultStoreOptionsType>(
  store: S,
  storeOptions?: O
): StoreFunctionType<S, O>;

function createStore(store: any, storeOptions: any) {
  _checkStoreOptions(storeOptions);
  const appStore = new Store();
  if (storeOptions && storeOptions.storeType === "group") {
    _validateStore(store);
    appStore.init(store);
    const useGroupStore = (target?: string, willDefineLater = false) => {
      if (process.env.NODE_ENV !== "production" && target === "") {
        throw _UtilError({
          name: `Connecting to ${target}`,
          message: `Target is optional. But it need to be valid if passed. Actual value is empty, fix it or remove it`
        });
      }
      return useStore(
        { target, willDefineLater },
        {
          storeType: "group",
          store: {
            store: appStore.store,
            actions: appStore.actions
          },
          storeController: appStore.storeController
        }
      );
    };

    if (storeOptions && storeOptions.dispatchMode === "everywhere") {
      return {
        dispatcher: appStore.actions,
        useStore: useGroupStore
      };
    }
    return useGroupStore;
  }

  appStore.initPrivate(store);

  const useSliceStore = (target?: string, willDefineLater = false) => {
    if (process.env.NODE_ENV !== "production" && target === "") {
      throw _UtilError({
        name: `Connecting to ${target}`,
        message: `Target is optional. But it need to be valid if passed. Actual value is empty, fix it or remove it`
      });
    }
    return useStore(
      { target, willDefineLater },
      {
        storeType: "slice",
        store: {
          store: appStore.privateStore,
          actions: appStore.privateStoreActions
        },
        storeController: appStore.storeController
      }
    );
  };

  if (storeOptions && storeOptions.dispatchMode === "everywhere") {
    console.log("here");
    return {
      dispatcher: appStore.privateStoreActions,
      useStore: useSliceStore
    };
  }
  return useSliceStore;
}

function getData(userParams: UserParamsType, storeParams: StoreParamsType) {
  const { paths, target, willDefineLater = false } = userParams;
  const { store, storeType } = storeParams;

  let result: any = {};

  const storeKey = paths[0];

  if (storeKey === "_D" && storeType === "slice") {
    return removeObservableAndProxy(store.store);
  }

  if (storeKey === "_A" && storeType === "slice") {
    return store.actions;
  }

  if (paths[1] === "_A") {
    return store.actions[storeKey];
  }

  if (paths[1] === "_D") {
    return removeObservableAndProxy(store.store[storeKey]);
  }

  if (storeType === "slice") {
    result = {
      ...store.store,
      ...store.actions
    };
  } else {
    for (const key in store.store) {
      result[key] = {
        ...store.store[key],
        ...store.actions[key]
      };
    }
  }

  paths.forEach((p) => {
    if (
      process.env.NODE_ENV !== "production" &&
      !willDefineLater &&
      result &&
      typeof result[p] === "undefined"
    ) {
      throw _UtilError({
        name: `Connecting to ${target}`,
        message: `${p} is undefined in the store. If it will be available later, just pass willDefineLater true as second param of useStore('',true). Use with caution`
      });
    }
    result = result ? result[p] : undefined;
  });

  return removeObservableAndProxy(result);
}

function useStore(
  userParams: Omit<UserParamsType, "paths">,
  storeParams: StoreParamsType
) {
  const { target } = userParams;
  const { storeType, storeController } = storeParams;

  const [paths, memoizedState, EVENT] = useMemo(() => {
    const paths = target ? target.split(".") : [];
    const EVENT =
      storeType === "group"
        ? paths[0] ?? GROUP_STORE_EVENT
        : PRIVATE_STORE_EVENT;
    return [paths, getData({ paths, ...userParams }, storeParams), EVENT];
  }, [target]);

  /*
   * We can create the snapShot like this
   * let snapShot = getData({ paths, ...userParams }, storeParams);
   * But since this hook will be called at each render, let's memoized the snapShot value.
   * We do not even return directly the snapShot to user. One more reason to memoize it.
   * We use the snapShot inside getSnapshot to keep same reference and avoid infinite render since useSyncExternalStore
   * call getSnapshot multiple time, I guess for stability reason
   * */
  let snapShot = memoizedState;

  const getSnapshot = useCallback(
    function () {
      // New data with new reference without proxy
      const newData = getData({ paths, ...userParams }, storeParams);
      /*
       * We use our custom verification tool, because Object.is just verify the reference and not the content.
       * Let's take snapShot = {value: 2} and newData = {value: 2}.
       * Object.is(snapShot,newData) will return false because, newData reference change everyTime it is call.
       * newData value is same as snapShot but newData reference is different from snapShot reference
       * This is because proxy is removed from the data before return.
       * */
      if (isSame(snapShot, newData)) {
        /*
         * snapshot is equal to newData (new object without proxy),
         * instead of return newData (new reference) and buy a ticket for infinite render,
         * We return snapShot again to keep same reference and avoid infinite render
         * */
        return snapShot;
      }

      /* We override snapShot with newData because they are not the same
       * At this point we can return snapshot or newData, it does not matter
       * Because both are same. But its important override snapShop with newData to make them same by value.
       * Since getSnapshot is called multiple time by useSyncExternalStore,
       * in next call isSame check will be true, and we will return snapshot not newData,
       * newData return a new object every time it is called, because he removes proxy on data before
       * return it. Removing proxy generate new object. We do that to help the user.
       * if he accidentally updates the data outside an action. it will not work.
       * Every mutation is guarantee to be inside defined actions. Any outside
       * mutation will fail and data integrity will be preserved
       * */
      snapShot = newData;
      // return snapshot or newData, it doesn't matter
      return snapShot;
    },
    [paths]
  );

  const dispatchData = useCallback(
    function (callback: any) {
      const subscribe = storeType === "group" ? paths[1] : paths[0];
      if (subscribe === "_A") {
        return () => void 0;
      }
      return storeController.subscribe(EVENT, callback);
    },
    [paths]
  );

  useEffect(() => {
    if (
      !["development", "production"].includes(process.env?.NODE_ENV as string)
    ) {
      console.warn(
        "@klm-lab/store",
        "process.env.NODE_ENV is not exposed. Make sure to expose it with 'production' value to be able to get the smallest and fastest" +
          " version of @klm-lab/store on production build"
      );
    }
  }, []);
  return useSyncExternalStore(dispatchData, getSnapshot, getSnapshot);
}

export { createStore };
