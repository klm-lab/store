import { ALL } from "../../constants/internal";
import { _checkConnectionToStore } from "../developement";
import { InternalStore } from "../store";

function createPath(target?: string) {
  return target ? (target === ALL ? [] : target.split(".")) : [];
}

export const getData = (target: string, internalStore: InternalStore) => {
  const paths = createPath(target);
  let result = internalStore.getStore();
  paths.forEach((p) => {
    _checkConnectionToStore && _checkConnectionToStore(result, paths, p);
    console.log(internalStore.getStore());
    result = result[p];
  });
  return result;
};
