import { ALL, SLICE } from "../../constants/internal";
import { StoreParamsType } from "../../types";
import { _checkConnectionToStore } from "../developement";

export function createPath(target?: string) {
  return target ? (target === ALL ? [] : target.split(".")) : [];
}

export function checkReWriteStoreAndGetResult(
  storeParams: StoreParamsType,
  paths: string[]
) {
  const { store, storeType } = storeParams;
  let result: any = {};
  if (storeType === SLICE) {
    result = {
      ...store.store,
      ...store.actions
    };
  } else {
    for (const key in store.store) {
      result[key] = {
        ...store.store[key],
        ...store.actions[key]
      };
    }
  }
  paths.forEach((p) => {
    _checkConnectionToStore && _checkConnectionToStore(result, paths, p);
    result = result ? result[p] : undefined;
  });
  return result;
}
