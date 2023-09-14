/* eslint-disable */
// @ts-nocheck
import { expect, test } from "vitest";
import { createStore } from "../src";
import { E_T, ERROR_TEXT } from "../src/constants/internal";

test("Test use store", () => {
  const emptyStore = createStore({ add: (store) => (store.newProp = 12) });
  const myStore = createStore({
    value: 0,
    arr: [],
    emptyMap: new Map(),
    dataMAp: new Map().set("t", true),
    emptySet: new Set(),
    dataSet: new Set().add("value"),
    func: (store, v) => (store.value += v),
    pushArr: (store) => store.arr.push("test"),
    setMap: (store) => store.emptyMap.set("test", "value"),
    addSet: (store) => store.emptySet.add("test set"),
    newArrayProp: (store) => (store.arrayProp = []),
    manipulateArray: (store, next) => next(store),
    newObjProp: (store) =>
      (store.objProp = {
        fgfg: {
          vb: 12,
          map: new Map().set("n", new Set([12]))
        }
      })
  });
  const myGroupStore = createStore({
    group: {
      value: 0,
      func: (store, v) => (store.value += v)
    }
  });
  expect(() => myGroupStore("23232")).toThrowError(
    ERROR_TEXT.STORE_PROPERTY_UNDEFINED.replace(E_T, "23232")
  );
  expect(() => myStore("")).toThrowError(ERROR_TEXT.OPTIONAL_INVALID_TARGET);
  expect(myStore("*")).toHaveProperty("value");
  expect(myStore("*")).toHaveProperty("func");
  expect(myStore("_A")).not.toHaveProperty("value");
  expect(myStore("_D")).not.toHaveProperty("func");
  expect(myGroupStore("*")).toHaveProperty("group.func");
  expect(myGroupStore("*")).toHaveProperty("group.value");
  expect(myGroupStore("_A")).not.toHaveProperty("group.value");
  expect(myGroupStore("group._A")).not.toHaveProperty("group.value");
  expect(myGroupStore("_D")).not.toHaveProperty("group.func");
  expect(myGroupStore("group._D")).not.toHaveProperty("group.func");
  //get group action
  const { func } = myGroupStore("group");
  // dispatch slice action
  myStore("_A").func(15);
  // dispatch group action
  func(2);
  // connect to group data
  const data = myGroupStore("group.value");
  const data_D1 = myGroupStore("group._D").value;
  const data_D2 = myGroupStore("_D").group.value;
  expect(data).toBe(2);
  expect(data_D1).toBe(2);
  expect(data_D2).toBe(2);
  // connect to slice data
  expect(myStore("_D").value).toBe(15);
  expect(myStore("value")).toBe(15);

  // Testing newProp

  emptyStore.dispatcher.add();
  expect(emptyStore("newProp")).toBe(12);

  // testing array, Map, Set changes
  const actions = myStore.getActions();
  actions.pushArr().setMap().addSet();
  const newData = myStore();
  expect(newData.arr).toContain("test");
  expect(newData.emptyMap.get("test")).toBe("value");
  expect(newData.emptySet).toContain("test set");
  // testing new props
  actions.newArrayProp();
  expect(myStore.getDataSnapshot()).toHaveProperty("arrayProp");
  actions.manipulateArray((store) => {
    store.arrayProp = [...Array(2).keys()];
    store.arrayProp.push("data");
  });
  expect(myStore.getDataSnapshot().arrayProp).toContain("data");
  expect(myStore.getDataSnapshot().arrayProp).toContain(1);
});
