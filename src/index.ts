import { _UtilError } from "./helpers/error";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  removeObservableAndProxy,
  storeController
} from "./helpers/tools";
import { PRIVATE_STORE_EVENT } from "./constants/internal";

class Store {
  private readonly _store: any;
  private _privateStore: any;
  private _privateStoreActions: any;
  private readonly _actionsStore: any;

  constructor() {
    this._store = {};
    this._privateStore = {};
    this._privateStoreActions = {};
    this._actionsStore = {};
    this.init = this.init.bind(this);
    this.separateActionsAndData = this.separateActionsAndData.bind(this);
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
        userStoreKey
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
            userFunction(...values)(sliceData);
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
      PRIVATE_STORE_EVENT
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
        element(...values)(sliceData);
        return actions;
      };
    }
  }
}

function createStore<S, O extends DefaultStoreOptionsType>(
  store: S,
  storeOptions: O
): CreateStoreType<S, O>;
function createStore<S, O>(store: S, storeOptions?: O): StoreFunctionType<S, O>;

function createStore(store: any, storeOptions: any) {
  _checkStoreOptions(storeOptions);
  const appStore = new Store();
  if (storeOptions && storeOptions.storeType === "group") {
    _validateStore(store);
    appStore.init(store);
    const useGroupStore = (target: string, willDefineLater = false) => {
      if (
        process.env.NODE_ENV !== "production" &&
        ((typeof target as any) !== "string" || target === "")
      ) {
        throw _UtilError({
          name: `Connecting to ${target}`,
          message: `At least one target is required if you are using a grouped store. If you don't want to provide one, use a sliceStore instead by removing storeType from storeOptions or set it to "slice"`
        });
      }
      return useStore(
        { target, willDefineLater },
        {
          storeType: "group",
          store: {
            store: appStore.store,
            actions: appStore.actions
          }
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

  const useSliceStore = (target?: string, willDefineLater = false) =>
    useStore(
      { target, willDefineLater },
      {
        storeType: "slice",
        store: {
          store: appStore.privateStore,
          actions: appStore.privateStoreActions
        }
      }
    );

  if (storeOptions && storeOptions.dispatchMode === "everywhere") {
    return {
      dispatcher: appStore.actions,
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

  const noProxyResult = removeObservableAndProxy(result);
  return typeof result === "function" ? () => noProxyResult : noProxyResult;
}

function useStore(
  userParams: Omit<UserParamsType, "paths">,
  storeParams: StoreParamsType
) {
  const { target } = userParams;
  const { storeType } = storeParams;

  const [paths, initialState] = useMemo(() => {
    const paths = target ? target.split(".") : [];
    return [paths, getData({ paths, ...userParams }, storeParams)];
  }, [target]);

  const [state, setState] = useState(initialState);

  const dispatchData = useCallback(
    function () {
      setState(getData({ paths, ...userParams }, storeParams));
    },
    [paths]
  );

  useEffect(() => {
    // This force a new render in dev mode to tell user that data is sync
    process.env.NODE_ENV !== "production" && setState(initialState);
    const EVENT = storeType === "group" ? paths[0] : PRIVATE_STORE_EVENT;
    return storeController.subscribe(EVENT, dispatchData);
  }, [dispatchData]);
  return state;
}

export { createStore };
