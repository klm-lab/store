import { useCallback, useSyncExternalStore } from "react";
import type { Store } from "../types";
import { finalize, getData } from "../helpers/util";
import { InternalStore } from "../helpers/store";

const createStore = <S>(store: S): Store<S> => {
  const newStore = new InternalStore().init(store);

  const useSyncStore = (target?: string) => {
    return useStore(newStore, target);
  };

  return finalize(useSyncStore, newStore);
};

const useStore = (internalStore: InternalStore, target?: string) => {
  const getSnapshot = useCallback(
    () => getData(internalStore, target),
    [target]
  );
  const dispatchData = useCallback(
    (callback: any) => internalStore.subscribe(target ?? "*", callback),
    [target]
  );
  return useSyncExternalStore(dispatchData, getSnapshot, getSnapshot);
};

export { createStore };
