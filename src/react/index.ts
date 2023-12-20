import type { FunctionType, StoreType } from "../types";
import { useSyncExternalStore } from "react";
import { createStore as init } from "../store";

export const createStore = <S>(store: S): StoreType<S> => {
  return init(store, (get: FunctionType, sub: FunctionType) =>
    useSyncExternalStore(sub, get, get)
  );
};
