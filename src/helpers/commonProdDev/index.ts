import { ALL } from "../../constants/internal";
import {
  FunctionType,
  InterceptOptionsType,
  StoreParamsType
} from "../../types";
import {
  _checkConnectionToStore,
  _checkInterceptorCall
} from "../developement";
import { removeObservableAndProxy } from "../util";

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
  callback: FunctionType
) {
  const { interceptorAction } = options;
  if (interceptorAction === "override.value") {
    _checkInterceptorCall && _checkInterceptorCall(options, interceptorAction);
  }
  if (interceptorAction === "override.key") {
    _checkInterceptorCall && _checkInterceptorCall(options, interceptorAction);
  }
  if (interceptorAction === "override.keyAndValue") {
    _checkInterceptorCall && _checkInterceptorCall(options, interceptorAction);
  }
  callback();
}

export function pathIsPreserved(event: string, getStore: any) {
  const paths = createPath(event);
  let preservePath = true;
  let result: any = {};
  getStore((store: any) => {
    result = { ...store };
    for (let i = 0; i < paths.length; i++) {
      try {
        if (!(paths[i] in result)) {
          preservePath = false;
          break;
        }
      } catch (e) {
        preservePath = false;
        break;
      }
      result = result[paths[i]];
    }
  });
  return { preservePath, update: removeObservableAndProxy(result) };
}
