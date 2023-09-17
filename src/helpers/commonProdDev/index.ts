import { ALL } from "../../constants/internal";
import { StoreParamsType } from "../../types";
import { _checkConnectionToStore } from "../developement";

function createPath(target?: string) {
  return target ? (target === ALL ? [] : target.split(".")) : [];
}

export const getData = (target: string, storeParams: StoreParamsType) => {
  const paths = createPath(target);
  const { store } = storeParams;
  let result = store.getStore();
  paths.forEach((p) => {
    _checkConnectionToStore && _checkConnectionToStore(result, paths, p);
    result = result[p];
  });
  return result;
};
