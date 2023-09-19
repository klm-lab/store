import { useCallback, useSyncExternalStore } from "react";
import type { FunctionType, StoreType } from "../types";
import { finalize } from "../util";
import { Store } from "../store";

const createStore = <S>(store: S): StoreType<S> => {
  const newStore = new Store().init(store);

  const useSyncStore = (target?: string) => {
    return useStore(newStore, target);
  };

  return finalize(useSyncStore, newStore);
};

const useStore = (internalStore: Store, target?: string) => {
  const getSnapshot = useCallback(
    () => internalStore.getData(target),
    [target]
  );
  const dispatchData = useCallback(
    (callback: FunctionType) =>
      internalStore.subscribe(target ?? "*", callback),
    [target]
  );
  return useSyncExternalStore(dispatchData, getSnapshot, getSnapshot);
};

export { createStore };
