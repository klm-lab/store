import type { StoreType } from "./types";
import { finalize } from "./util";
import { Store } from "./store";

const createStore = <S>(store: S): StoreType<S> => {
  const internalStore = new Store().init(store);
  const useVanillaStore = (target?: string) => {
    return internalStore.getData(target);
  };
  return finalize(useVanillaStore, internalStore);
};

export { createStore };
