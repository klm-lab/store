import type { Store } from "./types";
import { finalize, getData } from "./helpers/util";
import { InternalStore } from "./helpers/store";

const createStore = <S>(store: S): Store<S> => {
  const newStore = new InternalStore().init(store);
  const useVanillaStore = (target?: string) => {
    return getData(newStore, target);
  };
  return finalize(useVanillaStore, newStore);
};

export { createStore };
