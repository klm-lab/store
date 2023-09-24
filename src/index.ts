import type { StoreType } from "./types";
import { init } from "./store";

const createStore = <S>(store: S): StoreType<S> => init(store);

export { createStore };
