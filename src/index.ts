import type { Store } from "./types";
import { finalizeStore, getData } from "./helpers/util";
import { InternalStore } from "./helpers/store";

const createStore = <S>(store: S): Store<S> => {
  const newStore = new InternalStore().init(store);
  const useVanillaStore = (target?: string) => {
    return getData(newStore, target);
  };
  return finalizeStore(useVanillaStore, newStore);
};

export { createStore };
