import type { StoreParamsType } from "../../types";
import { ALL, E_T, ERROR_TEXT } from "../../constants/internal";
import { ErrorType, InterceptOptionsType } from "../../types";
import { getData } from "../commonProdDev";

function validateStore(store: any, errorMessage?: string) {
  if (typeof store === "undefined" || store === null) {
    _utilError &&
      _utilError({
        name: `Creating store`,
        message:
          errorMessage ?? ((ERROR_TEXT && ERROR_TEXT.STORE_EMPTY) as string),
        state: store
      });
  }
  if (store.constructor.name !== "Object") {
    _utilError &&
      _utilError({
        name: `Creating store`,
        message:
          errorMessage ??
          ((ERROR_TEXT && ERROR_TEXT.STORE_NOT_OBJECT) as string),
        state: store
      });
  }
}

function checkGroupStoreRootObject(store: any) {
  for (const key in store) {
    validateStore(
      store[key],
      (ERROR_TEXT &&
        ERROR_TEXT.GROUP_STORE_NOT_OBJECT.replace(E_T as string, key)) as string
    );
  }
}

function checkStoreTarget(target?: string) {
  if (
    typeof target !== "undefined" &&
    (target === "" || (typeof target as unknown) !== "string")
  ) {
    _utilError &&
      _utilError({
        name: `Connecting to ${target}`,
        message: (ERROR_TEXT && ERROR_TEXT.OPTIONAL_INVALID_TARGET) as string
      });
  }
}

function checkListenEvent(
  event: string,
  callback: any,
  storeParams: StoreParamsType,
  interception = false
) {
  if (
    (typeof event as unknown) !== "string" ||
    event === "" ||
    event === null ||
    event === undefined ||
    typeof event === "undefined" ||
    (interception && event === ALL)
  ) {
    _utilError &&
      _utilError({
        name: `${interception ? "Intercept" : "Listen to"} event ${event}`,
        message: (ERROR_TEXT && ERROR_TEXT.NOT_VALID_EVENT) as string
      });
  }
  /* we call getData here just to check if data exist
   * It is for listener, since they did not get data immediately after registration.
   * We need to check if the registration is valid
   */
  getData(event, storeParams);
  //Check callback
  if (typeof callback !== "function") {
    _utilError &&
      _utilError({
        name: `Listen to event ${event}`,
        message: (ERROR_TEXT && ERROR_TEXT.NOT_VALID_CALLBACK) as string
      });
  }
}

// function warnProdNodeENV() {
//   if (
//     typeof window !== "undefined" &&
//     "process" in window &&
//     !["development", "production"].includes(process?.env?.NODE_ENV as string)
//   ) {
//     console.warn(ERROR_TEXT && ERROR_TEXT.NO_NODE_ENV);
//   }
// }

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
        message: (ERROR_TEXT &&
          ERROR_TEXT.CAN_NOT_BE_CALLED.replace(E_T as string, name)) as string
      });
  }
}

function checkConnectionToStore(result: any, paths: string[], p: string) {
  function error() {
    _utilError &&
      _utilError({
        name: `Connecting to ${paths.join(".")}`,
        message: (ERROR_TEXT &&
          ERROR_TEXT.STORE_PROPERTY_UNDEFINED.replace(
            E_T as string,
            p
          )) as string
      });
  }

  try {
    if (!(p in result)) {
      error();
    }
  } catch (e) {
    error();
  }
}

function utilError(options: ErrorType) {
  console.error(options.name, "\n\n", options.message, "\n");
  throw options;
}

export const _utilError = process.env.NODE_ENV !== "production" && utilError;

export const _validateStore =
  process.env.NODE_ENV !== "production" && validateStore;

export const _checkListenEvent =
  process.env.NODE_ENV !== "production" && checkListenEvent;

export const _checkStoreTarget =
  process.env.NODE_ENV !== "production" && checkStoreTarget;
// export const _warnProdNodeENV =
//   process.env.NODE_ENV !== "production" && warnProdNodeENV;
export const _checkInterceptorCall =
  process.env.NODE_ENV !== "production" && checkInterceptorCall;
export const _checkConnectionToStore =
  process.env.NODE_ENV !== "production" && checkConnectionToStore;
export const _checkGroupStoreRootObject =
  process.env.NODE_ENV !== "production" && checkGroupStoreRootObject;
