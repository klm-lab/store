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
    gh: {},
    noLockedEvent: (store) => {
      delete store.gh.notExistedProp;
      delete store.notExistedProp;
    }
  });
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

  // testing deletion
  actions.deleteValueProp();
  expect(myStore.getDataSnapshot()).not.toHaveProperty("value");
  actions.deleteInSet();
  expect(myStore.getDataSnapshot().dataSet).not.toContain("value");
  actions.deleteInMap();
  expect(myStore.getDataSnapshot().dataMAp).not.toContain("t");
  actions.clearInSet();
  expect(myStore.getDataSnapshot().dataSet.size).toBe(0);
  actions.clearInMap();
  expect(myStore.getDataSnapshot().dataMAp.size).toBe(0);
});
test("Test use store override", () => {
  const myStore = createStore({
    value: 0,
    other: {
      data: "it is gine"
    },
    dataMAp: new Map().set("t", true).set("my", { data: false }),
    dataSet: new Set().add("value").add("otherValue"),
    deleteValueProp: (store) => {
      delete store.value;
    },
    deleteOther: (store) => {
      delete store.other;
    },
    deleteInSet: (store) => store.dataSet.delete("value"),
    deleteInMap: (store) => store.dataMAp.delete("t"),
    clearInSet: (store) => store.dataSet.clear(),
    clearInMap: (store) => store.dataMAp.clear()
  });

  const actions = myStore.getActions();

  // testing deletion override
  myStore.intercept("value", (store) => {
    store.override.key("ok");
  });

  myStore.intercept("other", (store) => {
    store.override.keyAndValue("ok");
  });
  actions.deleteValueProp();
  expect(myStore.getDataSnapshot()).toHaveProperty("value");
  expect(() => actions.deleteOther()).toThrowError(
    ERROR_TEXT.CAN_NOT_BE_CALLED.replace(E_T, "override.keyAndValue")
  );
});

test("Test use store override deletion in Map and Set", () => {
  const myStore = createStore({
    value: 0,
    other: {
      data: "it is gine"
    },
    toDelete: 10,
    dataMAp: new Map().set("t", true).set("my", { data: false }),
    dataMAp2: new Map().set("t", true).set("my", { data: false }),
    dataSet: new Set().add("value").add("otherValue").add("ok"),
    dataSet2: new Set().add("value2").add("otherValue2").add("ok"),
    deleteData: (store) => {
      delete store.toDelete;
    },
    updateMap: (store) => {
      store.dataMAp.set("t", "ok");
    },
    updateMap2: (store) => {
      store.dataMAp2.set("t", "ok");
    },
    clearMAp: (store) => {
      store.dataMAp.clear();
      store.dataMAp2.clear();
    },
    deleteInSet: (store) => {
      store.dataSet.delete("value");
      store.dataSet2.delete("value2");
    },
    deleteInMap: (store) => {
      store.dataMAp.delete("t");
      store.dataMAp2.delete("t");
    },
    clearInSet: (store) => store.dataSet.clear(),
    clearInMap: (store) => store.dataMAp.clear()
  });

  const actions = myStore.getActions();

  // testing deletion override
  myStore.intercept("dataMAp", (store) => {
    if (store.intercepted.action !== "clearInMap") {
      store.override.key("newKey");
    } else {
      store.allowAction();
    }
  });

  myStore.intercept("dataMAp2", (store) => {
    if (!["deleteInMap", "clearInMap"].includes(store.intercepted.action)) {
      store.override.keyAndValue("newKey", 10);
    } else {
      store.allowAction();
    }
  });

  myStore.intercept("dataSet", (store) => {
    store.override.value("ok");
  });

  myStore.intercept("dataSet2", (store) => {
    store.override.value("ok");
  });

  actions.updateMap();
  actions.updateMap2();
  expect(myStore.getDataSnapshot().dataMAp.get("newKey")).toBe("ok");
  expect(myStore.getDataSnapshot().dataMAp.get("t")).toBe(true);
  expect(myStore.getDataSnapshot().dataMAp2.get("newKey")).toBe(10);
  expect(myStore.getDataSnapshot().dataMAp2.get("t")).toBe(true);
  actions.deleteInMap();
  expect(myStore.getDataSnapshot().dataMAp.get("t")).toBeDefined();
  actions.deleteInSet();
  expect(myStore.getDataSnapshot().dataSet).toContain("value");
  expect(myStore.getDataSnapshot().dataSet2).toContain("value2");
  expect(myStore.getDataSnapshot().dataSet2).not.toContain("ok");
  actions.deleteData();
  expect(myStore.getDataSnapshot()).not.toHaveProperty("toDelete");
});

test("Test use store with no override in set or map or obj when clearing or deleting data", () => {
  const myStore = createStore({
    data: 12,
    other: 12,
    dataMAp: new Map().set("t", true).set("my", { data: false }),
    dataMAp2: new Map().set("t", true).set("my", { data: false }),
    dataSet: new Set().add("value").add("otherValue").add("ok"),
    dataSet2: new Set().add("value2").add("otherValue2"),
    deleteData: (store) => {
      delete store.data;
    },
    deleteOther: (store) => {
      delete store.other;
    },
    updateMap: (store) => {
      store.dataMAp.set("t", "ok");
    },
    updateMap2: (store) => {
      store.dataMAp2.set("t", "ok");
    },
    clearMAp: (store) => {
      store.dataMAp.clear();
      store.dataMAp2.clear();
    },
    deleteInSet: (store) => {
      store.dataSet.delete("value");
    },
    deleteInSet2: (store) => {
      store.dataSet2.delete("value2");
    },
    deleteInMap: (store) => {
      store.dataMAp.delete("t");
      store.dataMAp2.delete("t");
    },
    clearInSet: (store) => store.dataSet.clear(),
    clearInMap: (store) => store.dataMAp.clear()
  });

  myStore.intercept("dataMAp", (store) => {
    store.override.key("newKey");
  });

  myStore.intercept("dataSet", (store) => {
    store.override.key("ok");
  });
  //
  myStore.intercept("dataSet2", (store) => {
    store.override.keyAndValue("ok");
  });
  //
  myStore.intercept("data", (store) => {
    store.override.value("ok");
  });

  myStore.intercept("other", (store) => {
    store.override.keyAndValue("ok");
  });
  //
  const actions = myStore.getActions();
  //
  expect(() => actions.clearMAp()).toThrowError(
    ERROR_TEXT.CAN_NOT_BE_CALLED.replace(E_T, "override.key")
  );
  expect(() => actions.deleteInSet()).toThrowError(
    ERROR_TEXT.CAN_NOT_BE_CALLED.replace(E_T, "override.key")
  );
  expect(() => actions.deleteInSet2()).toThrowError(
    ERROR_TEXT.CAN_NOT_BE_CALLED.replace(E_T, "override.keyAndValue")
  );

  expect(() => actions.deleteData()).toThrowError(
    ERROR_TEXT.CAN_NOT_BE_CALLED.replace(E_T, "override.value")
  );

  expect(() => actions.deleteOther()).toThrowError(
    ERROR_TEXT.CAN_NOT_BE_CALLED.replace(E_T, "override.keyAndValue")
  );
});
