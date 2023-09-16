/* eslint-disable */
// @ts-nocheck
import { createStore } from "../src";
import { test, expect, vi } from "vitest";
import { E_T, ERROR_TEXT } from "../src/constants/internal";

test("Invalid store", () => {
  expect(() => createStore(undefined)).toThrowError(
    ERROR_TEXT && ERROR_TEXT.STORE_EMPTY
  );
  expect(() => createStore(null)).toThrowError(ERROR_TEXT.STORE_EMPTY);
  expect(() => createStore("")).toThrowError(ERROR_TEXT.STORE_NOT_OBJECT);
  expect(() => createStore(5)).toThrowError(ERROR_TEXT.STORE_NOT_OBJECT);
  expect(() => createStore(0)).toThrowError(ERROR_TEXT.STORE_NOT_OBJECT);
  expect(() => createStore(true)).toThrowError(ERROR_TEXT.STORE_NOT_OBJECT);
  expect(() => createStore({ data: 12 })).toThrowError(
    ERROR_TEXT.GROUP_STORE_NOT_OBJECT.replace(E_T, "data")
  );
});

test("Valid store", () => {
  const getStoreSpy = vi.fn(createStore);

  const myEmptyStore = getStoreSpy({});
  const myStore = getStoreSpy({ test: 12, func: () => null });
  const groupStore = getStoreSpy({ testGroup: { data: 12 } });

  const data = { test: 12, func: () => null };

  const myStoreWithAction = getStoreSpy(data);

  expect(myEmptyStore).toMatchObject({});
  expect(myStore()).toHaveProperty("test");
  expect(groupStore()).toMatchObject({ testGroup: { data: 12 } });
  expect(myStoreWithAction.getActions()).toHaveProperty("func");
  expect(getStoreSpy).toHaveReturned();
});

test("Store has properties", () => {
  const store = createStore({});
  const storeWithFunc = createStore({ func: () => null });
  expect(store).toBeTypeOf("function");
  expect(store).toHaveProperty("dispatcher");
  expect(store).toHaveProperty("listen");
  expect(store).toHaveProperty("intercept");
  expect(store).toHaveProperty("getActions");
  expect(store).toHaveProperty("getSnapshot");
  expect(storeWithFunc.dispatcher).toHaveProperty("func");
});

test("Detect store type", () => {
  const store1 = createStore({ test: 12, func: () => null });
  const store2 = createStore({ testGroup: { data: 12, func: () => null } });
  const store3 = createStore({
    testGroup: { data: 12, func: () => null },
    fn: () => null
  });
  const store1Actions = store1.getActions();
  const store2Actions = store2.getActions();
  const store3Actions = store3.getActions();
  // detect slice
  expect(store1Actions).toHaveProperty("func");
  expect(store1Actions).not.toHaveProperty("test");
  // detect group
  expect(store2Actions).toHaveProperty("testGroup.func");
  expect(store2Actions).not.toHaveProperty("data");
  // detect slice
  expect(store3Actions).toHaveProperty("fn");
  expect(store3Actions).not.toHaveProperty("testGroup");
});
