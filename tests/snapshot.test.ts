/* eslint-disable */
// @ts-nocheck
import { createStore } from "../src";
import { test, expect } from "vitest";
import { ERROR_TEXT } from "../src/constants/internal";

test("Actions snapshot values", () => {
  const store = createStore({});
  const store2 = createStore({ data: 12, func: () => null });
  const actions = store.getActions();
  const actions2 = store2.getActions();
  expect(actions).toMatchObject({});
  expect(actions2).toHaveProperty("func");
});

test("Data snapshot values", () => {
  const store = createStore({});
  const store2 = createStore({ data: 12, func: () => null });
  const dataSnapshot = store.getDataSnapshot();
  const dataSnapshot2 = store2.getDataSnapshot();
  expect(() => store2.getDataSnapshot("dhfjdhf")).toThrowError(
    ERROR_TEXT.NO_PARAMS
  );
  expect(dataSnapshot).toMatchObject({});
  expect(dataSnapshot2).toHaveProperty("data");
});

test("Store snapshot values", () => {
  const store = createStore({});
  const store2 = createStore({ data: 12, func: () => null });
  const storeSnapshot = store.getSnapshot();
  const storeSnapshot2 = store2.getSnapshot();
  const storeDatSnap = store2.getDataSnapshot();
  const storeActions = store2.getActions();
  expect(storeSnapshot).toMatchObject({});
  expect(storeSnapshot2).toHaveProperty("data", 12);
  expect(storeDatSnap).not.toHaveProperty("func");
  expect(storeActions).not.toHaveProperty("data");
});

test("Snapshot get new updated value", () => {
  const store = createStore({
    data: 12,
    func: (store, value) => (store.data += value ?? 1)
  });
  const storeSnapshot = store.getSnapshot();
  expect(storeSnapshot).toHaveProperty("data", 12);
  store.dispatcher.func();
  const newSnap = store.getSnapshot();
  expect(newSnap).toHaveProperty("data", 13);
  store.dispatcher.func(10);
  const lastSnap = store.getSnapshot();
  expect(lastSnap).toHaveProperty("data", 23);
});
