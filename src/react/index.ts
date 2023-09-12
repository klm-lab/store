import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Store, StoreParamsType } from "../types";
import {
  getData,
  getEventAndPath,
  isSame,
  getNewStore,
  finalizeStore
} from "../helpers/util";
import { _checkStoreTarget } from "../helpers/developement";
import { SUBSCRIPTION } from "../constants/internal";

function createStore<S>(store: S): Store<S> {
  const newStore = getNewStore(store);

  function useSyncStore(target?: string) {
    _checkStoreTarget(target);
    return useStore(newStore, target);
  }

  useSyncStore.dispatcher = newStore.store.actions;
  return finalizeStore(useSyncStore, newStore);
}

function useStore(storeParams: StoreParamsType, target?: string) {
  const { storeType, storeController } = storeParams;

  const [paths, memoizedState, EVENT, canSubscribe] = useMemo(() => {
    const { paths, event, canSubscribe } = getEventAndPath(
      SUBSCRIPTION,
      storeType,
      target
    );
    return [paths, getData(paths, storeParams), event, canSubscribe];
  }, [target]);

  /*
   * We can create the snapShot like this
   * let snapShot = getData({ paths, ...userParams }, storeParams);
   * But since this hook will be called at each render, let's memoized the snapShot value.
   * We do not even directly return the snapShot to user. One more reason to memoize it.
   * We use the snapShot inside getSnapshot to keep the same reference and avoid infinite render since useSyncExternalStore
   * call getSnapshot multiple times, I guess for stability reason
   * */
  let snapShot = memoizedState;

  const getSnapshot = useCallback(
    function () {
      // New data with new reference without proxy
      const newData = getData(paths, storeParams);
      /*
       * We use our custom verification tool, because Object.is just verify the reference and not the content.
       * Let's take snapShot = {value: 2} and newData = {value: 2}.
       * Object.is(snapShot,newData) will return false because newData reference changes everyTime it is called.
       * newData value is the same as snapshot, but newData reference is different from snapShot reference
       * This is because proxy is removed from the data before return.
       * */
      if (isSame(snapShot, newData)) {
        /*
         * snapshot is equal to newData (new object without a proxy),
         * instead of return newData (new reference) and buy a ticket for infinite render,
         * We return snapShot again to keep the same reference and avoid infinite render
         * */
        return snapShot;
      }

      /* We override snapShot with newData because they are not the same
       * At this point we can return snapshot or newData, it does not matter
       * Because both are the same.
       * But its important override snapShop with newData to make them same by value.
       * Since getSnapshot is called multiple time by useSyncExternalStore,
       * in next call isSame check will be true, and we will return snapshot not newData,
       * newData returns a new object every time it is called, because he removes proxy on data before
       * return it.
       * Removing proxy generates a new object.
       * We do that to help the user.
       * If he accidentally updates the data outside an action.
       * It will not work.
       * Every mutation is guaranteed to be inside defined actions.
       * Any outside
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
      if (!canSubscribe) {
        return () => void 0;
      }
      return storeController.subscribe(EVENT, callback);
    },
    [paths]
  );
  return useSyncExternalStore(dispatchData, getSnapshot, getSnapshot);
}

export { createStore };
