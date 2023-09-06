import type { VanillaStoreType } from "./types";
import { getNewStore, attachEvent } from "./helpers/tools";

function createStore<S>(store: S): VanillaStoreType<S> {
  const newStore = getNewStore(store);
  return attachEvent(
    {
      dispatcher: newStore.store.actions
    },
    newStore
  );
}

export { createStore };
