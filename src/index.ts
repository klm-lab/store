import type { Store } from "./types";
import {
  getNewStore,
  getData,
  getEventAndPath,
  finalizeStore
} from "./helpers/util";
import { _checkStoreTarget } from "./helpers/developement";

function createStore<S>(store: S): Store<S> {
  const newStore = getNewStore(store);
  function useVanillaStore(target?: string) {
    _checkStoreTarget(target);
    const { paths } = getEventAndPath(target);
    return getData(paths, newStore);
  }
  useVanillaStore.dispatcher = newStore.store.actions;
  return finalizeStore(useVanillaStore, newStore);
}

export { createStore };
