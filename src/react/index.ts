import { useCallback, useSyncExternalStore } from "react";
import type { FunctionType, ReactHook, StoreType } from "../types";
import { init } from "../store";

const createStore = <S>(store: S): StoreType<S> => {
  return init(store, (store: ReactHook, target?: string) => {
    const getSnapshot = useCallback(() => store.get(target), [target]);
    const dispatchData = useCallback(
      (callback: FunctionType) => store.subscribe(target ?? "*", callback),
      [target]
    );
    return useSyncExternalStore(dispatchData, getSnapshot, getSnapshot);
  });
};

export { createStore };
