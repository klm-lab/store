import type { StoreParamsType } from "../../types";
import { GROUP, SLICE } from "../../constants/internal";
import { ErrorType, InterceptOptionsType } from "../../types";
import { checkReWriteStoreAndGetResult, createPath } from "../commonProdDev";

function validateStore(store: any) {
  if (store === null || store?.constructor?.name !== "Object") {
    _utilError({
      name: `Creating store`,
      message: `The store is not an object"`,
      state: store
    });
  }
  for (const storeKey in store) {
    if (store[storeKey]?.constructor.name !== "Object") {
      _utilError({
        name: `Creating store`,
        message: `Property ${storeKey} is not an object. Any data + action give a slice. Any non object data without action give a slice. Any data without action give a group which required object as first entry.`,
        state: store[storeKey]
      });
    }
  }
}

function checkOnEvent(event: string) {
  if (event !== "change") {
    _utilError({
      name: `Listen to event ${event}`,
      message: `This listener is for change event. Pass event 'change' to be able to listen.`,
      state: event
    });
  }
}

function checkStoreTarget(target?: string) {
  if (
    typeof target !== "undefined" &&
    (target === "" || (typeof target as unknown) !== "string")
  ) {
    _utilError({
      name: `Connecting to ${target}`,
      message: `Target is optional. But it need to be valid if passed. Actual value is empty, fix it or remove it`
    });
  }
}

function checkNull(target?: string) {
  if (typeof target !== "undefined") {
    _utilError({
      name: `Snapshot getter`,
      message: `No params are allowed here. Please remove it`,
      state: target
    });
  }
}

function checkListenToEvent(
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
      message: `Provide a valid event to be able to listen.`
    });
  }

  const paths = createPath(event);
  const storeKey = paths[0];
  if (["_D", "_A"].includes(storeKey) && storeType === SLICE) {
    return;
  }

  if (["_D", "_A"].includes(paths[1]) && storeType === GROUP) {
    return;
  }

  checkReWriteStoreAndGetResult(storeParams, paths);

  if (typeof callback !== "function") {
    _utilError({
      name: `Listen to event ${event}`,
      message: `Provide a valid callback, a function to be able to listen.`
    });
  }
}

function warnProdNodeENV() {
  if (
    typeof window !== "undefined" &&
    "process" in window &&
    !["development", "production"].includes(process?.env?.NODE_ENV as string)
  ) {
    console.warn(
      `@klm-lab/store \n NODE_ENV is not exposed as environment variable. Make sure to expose it with production value to be able to get the smallest and fastest version of @klm-lab/store on production build`
    );
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
        message: `Current action not allow you to call ${name}`
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
      message: `Current action not allow you to call ${name}`
    });
  }
}

function checkSet({ key }: any, state: any) {
  _utilError({
    name: `Override key ${key} in Set`,
    message: "Set does not have any key to override",
    state
  });
}

function checkConnectionToStore(result: any, paths: string[], p: string) {
  if (!result || (result && typeof result[p] === "undefined")) {
    _utilError({
      name: `Connecting to ${paths.join(".")}`,
      message: `${p} is undefined in the store.`
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

export const _checkListenToEvent =
  process.env.NODE_ENV !== "production" ? checkListenToEvent : () => void 0;

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
