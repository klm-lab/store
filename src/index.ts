import type { Store } from "./types";
import {
  getNewStore,
  getData,
  getEventAndPath,
  finalizeStore
} from "./helpers/util";
import { _checkStoreTarget } from "./helpers/developement";
import { SUBSCRIPTION } from "./constants/internal";

function createStore<S>(store: S): Store<S> {
  const newStore = getNewStore(store);
  function useVanillaStore(target?: string) {
    _checkStoreTarget && _checkStoreTarget(target);
    const { paths } = getEventAndPath(SUBSCRIPTION, newStore.storeType, target);
    return getData(paths, newStore);
  }
  useVanillaStore.dispatcher = newStore.store.actions;
  return finalizeStore(useVanillaStore, newStore);
}

export { createStore };
