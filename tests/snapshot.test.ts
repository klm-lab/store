/* eslint-disable */
// @ts-nocheck
import { createStore } from "../src";
import { test, expect } from "vitest";
import { ERROR_TEXT } from "../src/constants/internal";

test("Actions snapshot values", () => {
  const store = createStore({});
  const store2 = createStore({ data: 12, func: () => null });
  const actions = store.actions;
  const actions2 = store2.actions;
  expect(actions).toMatchObject({});
  expect(actions2).toHaveProperty("func");
});

test("Data snapshot values", () => {
  const store = createStore({});
  const store2 = createStore({ data: 12, func: () => null });
  const dataSnapshot = store.getSnapshot();
  const dataSnapshot2 = store2.getSnapshot();
  const dataSnapshot3 = store2.getSnapshot("data.deep.deep");
  expect(dataSnapshot).toMatchObject({});
  expect(dataSnapshot2).toHaveProperty("data");
  expect(dataSnapshot3).not.toBeDefined();
});

test("StoreType snapshot values", () => {
  const store = createStore({});
  const store2 = createStore({ data: 12, func: () => null });
  const storeSnapshot = store.getSnapshot();
  const storeSnapshot2 = store2.getSnapshot();
  const storeDatSnap = store2.getSnapshot();
  const storeActions = store2.actions;
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
  store.actions.func();
  const newSnap = store.getSnapshot();
  expect(newSnap).toHaveProperty("data", 13);
  store.actions.func(10);
  const lastSnap = store.getSnapshot();
  expect(lastSnap).toHaveProperty("data", 23);
});
