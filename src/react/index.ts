import { useCallback, useSyncExternalStore } from "react";
import type { Store, StoreParamsType } from "../types";
import { getNewStore, finalizeStore } from "../helpers/util";
import { _checkStoreTarget } from "../helpers/developement";
import { getData } from "../helpers/commonProdDev";
import { ALL } from "../constants/internal";

function createStore<S>(store: S): Store<S> {
  const newStore = getNewStore(store);
  function useSyncStore(target?: string) {
    _checkStoreTarget && _checkStoreTarget(target);
    return useStore(newStore, target);
  }
  return finalizeStore(useSyncStore, newStore);
}

function useStore(storeParams: StoreParamsType, target?: string) {
  const getSnapshot = useCallback(
    () => getData(target as string, storeParams),
    [target]
  );
  const dispatchData = useCallback(
    (callback: any) =>
      storeParams.storeController.subscribe(target ?? ALL, callback),
    [target]
  );
  return useSyncExternalStore(dispatchData, getSnapshot, getSnapshot);
}

export { createStore };
