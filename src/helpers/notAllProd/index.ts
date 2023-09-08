import type { StoreParamsType } from "../../types";
import { _UtilError } from "../error";

export function checkReWriteStoreAndGetResult(
  storeParams: StoreParamsType,
  target?: string
) {
  const PATHS = target ? target.split(".") : [];
  const { store, storeType } = storeParams;
  let result: any = {};
  if (storeType === "slice") {
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

  PATHS.forEach((p) => {
    if (
      process.env.NODE_ENV !== "production" &&
      result &&
      typeof result[p] === "undefined"
    ) {
      throw _UtilError({
        name: `Connecting to ${target}`,
        message: `${p} is undefined in the store.`
      });
    }

    result = result ? result[p] : undefined;
  });

  return result;
}

function validateStore(store: any) {
  if (store === null || store?.constructor?.name !== "Object") {
    throw _UtilError({
      name: `Creating store`,
      message: `The store is not an object"`,
      state: store
    });
  }
  for (const storeKey in store) {
    if (store[storeKey]?.constructor.name !== "Object") {
      throw _UtilError({
        name: `Creating store`,
        message: `Property ${storeKey} is not an object. Any data + action give a slice. Any non object data without action give a slice. Any data without action give a group which required object as first entry.`,
        state: store[storeKey]
      });
    }
  }
}

function checkOnEvent(event: string) {
  if (process.env.NODE_ENV !== "production" && event !== "change") {
    throw _UtilError({
      name: `Listen to event ${event}`,
      message: `This listener is for change event. Pass event 'change' to be able to listen.`,
      state: event
    });
  }
}

function checkStoreTarget(target?: string) {
  if (
    process.env.NODE_ENV !== "production" &&
    typeof target !== "undefined" &&
    (target === "" || (typeof target as unknown) !== "string")
  ) {
    throw _UtilError({
      name: `Connecting to ${target}`,
      message: `Target is optional. But it need to be valid if passed. Actual value is empty, fix it or remove it`
    });
  }
}

function checkNull(target?: string) {
  if (process.env.NODE_ENV !== "production" && typeof target !== "undefined") {
    throw _UtilError({
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
    (process.env.NODE_ENV !== "production" &&
      (typeof event as unknown) !== "string") ||
    event === "" ||
    event === null ||
    event === undefined ||
    typeof event === "undefined"
  ) {
    throw _UtilError({
      name: `Listen to event ${event}`,
      message: `Provide a valid event to be able to listen.`
    });
  }

  const PATHS = event.split(".");
  const storeKey = PATHS[0];
  if (["_D", "_A"].includes(storeKey) && storeType === "slice") {
    return;
  }

  if (["_D", "_A"].includes(PATHS[1]) && storeType === "group") {
    return;
  }

  checkReWriteStoreAndGetResult(storeParams, event);

  if (typeof callback !== "function") {
    throw _UtilError({
      name: `Listen to event ${event}`,
      message: `Provide a valid callback, a function to be able to listen.`
    });
  }
}

export function warnProdNodeENV() {
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
