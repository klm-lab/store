import { useCallback, useSyncExternalStore } from "react";
import type { FunctionType, Util, StoreType } from "../types";
import { init } from "../store";

const createStore = <S>(store: S): StoreType<S> => {
  return init(store, (util: Util, target?: string) => {
    const get = useCallback(() => util.get(target), [target]);
    const dp = useCallback(
      (cb: FunctionType) => util.sub(target, cb),
      [target]
    );
    return useSyncExternalStore(dp, get, get);
  });
};

export { createStore };
