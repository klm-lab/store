import type { FunctionType, StoreType } from "../types";
import { useCallback, useSyncExternalStore } from "react";
import { createStore as init } from "../store";

export const createStore = <S>(store: S): StoreType<S> => {
  return init(
    store,
    (get: FunctionType, sub: FunctionType, target?: string) => {
      const getS = useCallback(() => get(target), [target]);
      return useSyncExternalStore(sub, getS, getS);
    }
  );
};
