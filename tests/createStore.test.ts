/* eslint-disable */
// @ts-nocheck
import { createStore } from "../src";
import { test, expect, vi } from "vitest";
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
  expect(myStoreWithAction.actions).toHaveProperty("func");
  expect(getStoreSpy).toHaveReturned();
});

test("StoreType has properties", () => {
  const store = createStore({});
  const storeWithFunc = createStore({ func: () => null });
  expect(store).toBeTypeOf("function");
  expect(store).toHaveProperty("actions");
  expect(store).toHaveProperty("listen");
  expect(store).toHaveProperty("getSnapshot");
  expect(storeWithFunc.actions).toHaveProperty("func");
});

test("Detect store type", () => {
  const store1 = createStore({ test: 12, func: () => null });
  const store3 = createStore({
    testGroup: { data: 12, func: () => null },
    fn: () => null
  });
  const store1Actions = store1.actions;
  const store3Actions = store3.actions;
  // detect slice
  expect(store1Actions).toHaveProperty("func");
  expect(store1Actions).not.toHaveProperty("test");
  // detect slice
  expect(store3Actions).toHaveProperty("fn");
  expect(store3Actions).not.toHaveProperty("testGroup");
});
