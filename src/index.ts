import type { Store } from "./types";
import {
  getNewStore,
  getData,
  getEventAndPath,
  finalizeStore
} from "./helpers/tools";
import { _checkStoreTarget } from "./helpers/notAllProd";

function createStore<S>(store: S): Store<S> {
  const newStore = getNewStore(store);
  function useVanillaStore(target?: string) {
    _checkStoreTarget(target);
    const { paths } = getEventAndPath(newStore, target);
    return getData({ paths, target }, newStore);
  }
  useVanillaStore.dispatcher = newStore.store.actions;
  return finalizeStore(useVanillaStore, newStore);
}

export { createStore };
