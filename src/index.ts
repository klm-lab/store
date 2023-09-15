import type { Store } from "./types";
import { getNewStore, finalizeStore } from "./helpers/util";
import { _checkStoreTarget } from "./helpers/developement";
import { getData } from "./helpers/commonProdDev";

function createStore<S>(store: S): Store<S> {
  const newStore = getNewStore(store);
  function useVanillaStore(target?: string) {
    _checkStoreTarget && _checkStoreTarget(target);
    return getData(target as string, newStore);
  }
  return finalizeStore(useVanillaStore, newStore);
}

export { createStore };
