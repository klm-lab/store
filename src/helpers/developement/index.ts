import type { StoreParamsType } from "../../types";
import { E_T, ERROR_TEXT, GROUP } from "../../constants/internal";
import { ErrorType, InterceptOptionsType } from "../../types";
import { checkReWriteStoreAndGetResult, createPath } from "../commonProdDev";

function validateStore(store: any, errorMessage?: string) {
  if (typeof store === "undefined" || store === null) {
    _utilError({
      name: `Creating store`,
      message: errorMessage ?? ERROR_TEXT.STORE_EMPTY,
      state: store
    });
  }
  if (store.constructor.name !== "Object") {
    _utilError({
      name: `Creating store`,
      message: errorMessage ?? ERROR_TEXT.STORE_NOT_OBJECT,
      state: store
    });
  }
}

function checkGroupStoreRootObject(store: any) {
  for (const key in store) {
    validateStore(
      store[key],
      ERROR_TEXT.GROUP_STORE_NOT_OBJECT.replace(E_T, key)
    );
  }
}

function checkOnEvent(event: string, callback: any) {
  if (event !== "change") {
    _utilError({
      name: `Listen to event ${event}`,
      message: ERROR_TEXT.NOT_CHANGE_EVENT,
      state: event
    });
  }
  checkCallback(event, callback);
}

function checkStoreTarget(target?: string) {
  if (
    typeof target !== "undefined" &&
    (target === "" || (typeof target as unknown) !== "string")
  ) {
    _utilError({
      name: `Connecting to ${target}`,
      message: ERROR_TEXT.OPTIONAL_INVALID_TARGET
    });
  }
}

function checkNull(target?: string) {
  if (typeof target !== "undefined") {
    _utilError({
      name: `Snapshot getter`,
      message: ERROR_TEXT.NO_PARAMS,
      state: target
    });
  }
}

function checkCallback(event: string, callback: any) {
  if (typeof callback !== "function") {
    _utilError({
      name: `Listen to event ${event}`,
      message: ERROR_TEXT.NOT_VALID_CALLBACK
    });
  }
}

function checkListenEvent(
  event: string,
  callback: any,
  storeParams: StoreParamsType
) {
  const { storeType } = storeParams;
  if (
    (typeof event as unknown) !== "string" ||
    event === "" ||
    event === null ||
    event === undefined ||
    typeof event === "undefined"
  ) {
    _utilError({
      name: `Listen to event ${event}`,
      message: ERROR_TEXT.NOT_VALID_EVENT
    });
  }

  const paths = createPath(event);
  const storeKey = paths[0];
  if (["_D", "_A"].includes(storeKey)) {
    return;
  }

  if (["_D", "_A"].includes(paths[1]) && storeType === GROUP) {
    return;
  }

  checkReWriteStoreAndGetResult(storeParams, paths);
  checkCallback(event, callback);
}

function warnProdNodeENV() {
  if (
    typeof window !== "undefined" &&
    "process" in window &&
    !["development", "production"].includes(process?.env?.NODE_ENV as string)
  ) {
    console.warn(ERROR_TEXT.NO_NODE_ENV);
  }
}

function checkInterceptorCall(
  options: InterceptOptionsType,
  name: string,
  key = false
) {
  if (key) {
    if (["clearInSet", "clearInMap"].includes(options.action)) {
      _utilError({
        name: `Override when action is ${options.action}`,
        message: ERROR_TEXT.CAN_NOT_BE_CALLED.replace(E_T, name)
      });
    }
    return;
  }
  if (
    [
      "delete",
      "deleteInSet",
      "deleteInMap",
      "clearInSet",
      "clearInMap"
    ].includes(options.action)
  ) {
    _utilError({
      name: `Override when action is ${options.action}`,
      message: ERROR_TEXT.CAN_NOT_BE_CALLED.replace(E_T, name)
    });
  }
}

function checkSet({ key }: any, state: any) {
  _utilError({
    name: `Override key ${key} in Set`,
    message: ERROR_TEXT.NO_KEY_TO_OVERRIDE_SET,
    state
  });
}

function checkConnectionToStore(result: any, paths: string[], p: string) {
  if (!result || (result && typeof result[p] === "undefined")) {
    _utilError({
      name: `Connecting to ${paths.join(".")}`,
      message: ERROR_TEXT.STORE_PROPERTY_UNDEFINED.replace(E_T, p)
    });
  }
}

function utilError(options: ErrorType) {
  console.error(options.name, "\n\n", options.message, "\n");
  throw options;
}

export const _utilError =
  process.env.NODE_ENV !== "production" ? utilError : () => void 0;

export const _validateStore =
  process.env.NODE_ENV !== "production" ? validateStore : () => void 0;

export const _checkOnEvent =
  process.env.NODE_ENV !== "production" ? checkOnEvent : () => void 0;

export const _checkListenEvent =
  process.env.NODE_ENV !== "production" ? checkListenEvent : () => void 0;

export const _checkStoreTarget =
  process.env.NODE_ENV !== "production" ? checkStoreTarget : () => void 0;
export const _checkNull =
  process.env.NODE_ENV !== "production" ? checkNull : () => void 0;
export const _warnProdNodeENV =
  process.env.NODE_ENV !== "production" ? warnProdNodeENV : () => void 0;
export const _checkInterceptorCall =
  process.env.NODE_ENV !== "production" ? checkInterceptorCall : () => void 0;
export const _checkSet =
  process.env.NODE_ENV !== "production" ? checkSet : () => void 0;
export const _checkConnectionToStore =
  process.env.NODE_ENV !== "production" ? checkConnectionToStore : () => void 0;
export const _checkGroupStoreRootObject =
  process.env.NODE_ENV !== "production"
    ? checkGroupStoreRootObject
    : () => void 0;
