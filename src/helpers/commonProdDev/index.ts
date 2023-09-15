import { ALL } from "../../constants/internal";
import {
  FunctionType,
  InterceptOptionsType,
  InterceptorActionsType,
  StoreParamsType
} from "../../types";
import {
  _checkConnectionToStore,
  _checkInterceptorCall
} from "../developement";

function createPath(target?: string) {
  return target ? (target === ALL ? [] : target.split(".")) : [];
}

export function getData(target: string, storeParams: StoreParamsType) {
  const paths = createPath(target);
  const { store } = storeParams;
  let result = store.getStore();
  paths.forEach((p) => {
    _checkConnectionToStore && _checkConnectionToStore(result, paths, p);
    result = result[p];
  });
  return result;
}

export function callIfYouCan(
  options: InterceptOptionsType,
  interceptorAction: InterceptorActionsType,
  callback: FunctionType
) {
  if (interceptorAction === "override.value") {
    _checkInterceptorCall && _checkInterceptorCall(options, interceptorAction);
  }
  if (interceptorAction === "override.key") {
    _checkInterceptorCall && _checkInterceptorCall(options, interceptorAction);
  }
  if (interceptorAction === "override.keyAndValue") {
    _checkInterceptorCall && _checkInterceptorCall(options, interceptorAction);
  }
  interceptorAction !== "rejectAction" && callback();
}
