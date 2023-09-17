/* eslint-disable */
// @ts-nocheck
import { expect, test } from "vitest";
import { createStore } from "../src";
import { E_T, ERROR_TEXT } from "../src/constants/internal";

test("Test use store with locked event", () => {
  const emptyStore = createStore({
    add: (store) => {
      store.newProp = new Map().set("lock", { data: false });
      store.gh = {};
    },
    update: (store) => {
      store.newProp.get("lock").data = true;
      store.newProp.get("lock").newPropInsideMap = 12;
    }
  });

  const myStore = createStore({
    value: undefined,
    gh: {},
    noLockedEvent: (store) => {
      delete store.gh.notExistedProp;
      delete store.notExistedProp;
    }
  });

  const value = myStore("value");

  // Testing newProp
  emptyStore.dispatcher.add();
  expect(emptyStore("newProp").get("lock")).toMatchObject({ data: false });
  emptyStore.dispatcher.update();
  expect(emptyStore("newProp").get("lock").data).toBe(true);
  myStore.dispatcher.noLockedEvent();
  expect(myStore()).toHaveProperty("gh");
});
test("Test use store", () => {
  const emptyStore = createStore({ add: (store) => (store.newProp = 12) });
  const myStore = createStore({
    value: 0,
    arr: [],
    emptyMap: new Map(),
    dataMAp: new Map().set("t", true).set("my", false),
    emptySet: new Set(),
    dataSet: new Set().add("value").add("otherValue"),
    func: (store, v) => (store.value += v),
    pushArr: (store) => store.arr.push("test"),
    setMap: (store) => store.emptyMap.set("test", "value"),
    addSet: (store) => store.emptySet.add("test set"),
    newArrayProp: (store) => (store.arrayProp = []),
    manipulateArray: (store, next) => next(store),
    deleteValueProp: (store) => delete store.value,
    deleteInSet: (store) => store.dataSet.delete("value"),
    deleteInMap: (store) => store.dataMAp.delete("t"),
    clearInSet: (store) => store.dataSet.clear(),
    clearInMap: (store) => store.dataMAp.clear()
  });
  const myGroupStore = createStore({
    group: {
      value: 0,
      func: (store, v) => (store.value += v)
    }
  });
  expect(() => myGroupStore("23232")).toThrowError(
    `23232 is undefined in the store.`
  );
  expect(() => myStore("")).toThrowError(
    "Target is optional. But it need to be valid if passed. Actual value is empty, fix it or remove it"
  );
  expect(myStore.getActions()).not.toHaveProperty("value");
  expect(myStore.getActions()).not.toHaveProperty("group.value");
  expect(myStore.getActions()).not.toHaveProperty("group.value");
  expect(myStore.getActions()).not.toHaveProperty("group.value");
  //get group action
  const { func } = myGroupStore.dispatcher.group;
  // dispatch slice action
  myStore.getActions().func(15);
  // dispatch group action
  func(2);
  // connect to group data
  const data = myGroupStore("group.value");
  const data_D1 = myGroupStore("group").value;
  const data_D2 = myGroupStore("*").group.value;
  expect(data).toBe(2);
  expect(data_D1).toBe(2);
  expect(data_D2).toBe(2);
  // connect to slice data
  expect(myStore().value).toBe(15);
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
  expect(myStore.getSnapshot()).toHaveProperty("arrayProp");
  actions.manipulateArray((store) => {
    store.arrayProp = [...Array(2).keys()];
    store.arrayProp.push("data");
  });
  expect(myStore.getSnapshot().arrayProp).toContain("data");
  expect(myStore.getSnapshot().arrayProp).toContain(1);

  // testing deletion
  actions.deleteValueProp();
  expect(myStore.getSnapshot()).not.toHaveProperty("value");
  actions.deleteInSet();
  expect(myStore.getSnapshot().dataSet).not.toContain("value");
  actions.deleteInMap();
  expect(myStore.getSnapshot().dataMAp).not.toContain("t");
  actions.clearInSet();
  expect(myStore.getSnapshot().dataSet.size).toBe(0);
  actions.clearInMap();
  expect(myStore.getSnapshot().dataMAp.size).toBe(0);
});
