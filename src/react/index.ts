import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ReactStoreType, StoreParamsType, UserParamsType } from "../types";
import {
  attachEvent,
  getData,
  getEventAndPath,
  isSame,
  getNewStore
} from "../helpers/tools";
import { _checkStoreTarget } from "../helpers/notAllProd";

function createStore<S>(store: S): ReactStoreType<S> {
  const newStore = getNewStore(store);

  function useSynStore(target?: string) {
    _checkStoreTarget(target);
    return useStore({ target }, newStore);
  }

  useSynStore.dispatcher = newStore.store.actions;
  return attachEvent(useSynStore, newStore);
}

function useStore(
  userParams: Omit<UserParamsType, "paths">,
  storeParams: StoreParamsType
) {
  const { target } = userParams;
  const { storeType, storeController } = storeParams;

  const [paths, memoizedState, EVENT] = useMemo(() => {
    const { paths, event } = getEventAndPath(storeParams, target);
    return [paths, getData({ paths, ...userParams }, storeParams), event];
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
  return useSyncExternalStore(dispatchData, getSnapshot, getSnapshot);
}

export { createStore };
