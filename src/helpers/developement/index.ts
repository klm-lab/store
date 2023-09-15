import type { EventType, StoreParamsType } from "../../types";
import { E_T, ERROR_TEXT, GROUP, SUBSCRIPTION } from "../../constants/internal";
import { ErrorType, InterceptOptionsType } from "../../types";
import { checkReWriteStoreAndGetResult, createPath } from "../commonProdDev";

function validateStore(store: any, errorMessage?: string) {
  if (typeof store === "undefined" || store === null) {
    _utilError &&
      _utilError({
        name: `Creating store`,
        message: errorMessage ?? ERROR_TEXT.STORE_EMPTY,
        state: store
      });
  }
  if (store.constructor.name !== "Object") {
    _utilError &&
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
    _utilError &&
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
    _utilError &&
      _utilError({
        name: `Connecting to ${target}`,
        message: ERROR_TEXT.OPTIONAL_INVALID_TARGET
      });
  }
}

function checkNull(target?: string) {
  if (typeof target !== "undefined") {
    _utilError &&
      _utilError({
        name: `Snapshot getter`,
        message: ERROR_TEXT.NO_PARAMS,
        state: target
      });
  }
}

function checkCallback(event: string, callback: any) {
  if (typeof callback !== "function") {
    _utilError &&
      _utilError({
        name: `Listen to event ${event}`,
        message: ERROR_TEXT.NOT_VALID_CALLBACK
      });
  }
}

function checkListenEvent(
  event: string,
  callback: any,
  storeParams: StoreParamsType,
  eventType: EventType
) {
  const { storeType } = storeParams;
  if (
    (typeof event as unknown) !== "string" ||
    event === "" ||
    event === null ||
    event === undefined ||
    typeof event === "undefined"
  ) {
    _utilError &&
      _utilError({
        name: `Listen to event ${event}`,
        message:
          eventType === SUBSCRIPTION
            ? ERROR_TEXT.NOT_VALID_LISTEN_EVENT
            : ERROR_TEXT.NOT_VALID_INTERCEPT_EVENT
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
    // typeof window !== "undefined" &&
    // "process" in window &&
    !["development", "production"].includes(process?.env?.NODE_ENV as string)
  ) {
    console.warn(ERROR_TEXT.NO_NODE_ENV);
  }
}

function checkInterceptorCall(options: InterceptOptionsType, name: string) {
  const NOT_ALLOWED = {
    "override.value": ["delete", "deleteInMap", "clearInSet", "clearInMap"],
    "override.key": ["clearInSet", "clearInMap", "deleteInSet", "addInSet"],
    "override.keyAndValue": [
      "delete",
      "clearInSet",
      "clearInMap",
      "deleteInSet",
      "deleteInMap",
      "addInSet"
    ]
  } as any;
  if (NOT_ALLOWED[name].includes(options.action)) {
    _utilError &&
      _utilError({
        name: `Override when action is ${options.action}`,
        message: ERROR_TEXT.CAN_NOT_BE_CALLED.replace(E_T, name)
      });
  }
}

function checkConnectionToStore(result: any, paths: string[], p: string) {
  if (!result || (result && typeof result[p] === "undefined")) {
    _utilError &&
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

export const _utilError = process.env.NODE_ENV !== "production" && utilError;

export const _validateStore =
  process.env.NODE_ENV !== "production" && validateStore;

export const _checkOnEvent =
  process.env.NODE_ENV !== "production" && checkOnEvent;

export const _checkListenEvent =
  process.env.NODE_ENV !== "production" && checkListenEvent;

export const _checkStoreTarget =
  process.env.NODE_ENV !== "production" && checkStoreTarget;
export const _checkNull = process.env.NODE_ENV !== "production" && checkNull;
export const _warnProdNodeENV =
  process.env.NODE_ENV !== "production" && warnProdNodeENV;
export const _checkInterceptorCall =
  process.env.NODE_ENV !== "production" && checkInterceptorCall;
export const _checkConnectionToStore =
  process.env.NODE_ENV !== "production" && checkConnectionToStore;
export const _checkGroupStoreRootObject =
  process.env.NODE_ENV !== "production" && checkGroupStoreRootObject;
