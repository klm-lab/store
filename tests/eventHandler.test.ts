/* eslint-disable */
// @ts-nocheck
import { createStore } from "../src";
import { test, expect, vi } from "vitest";

test("Invalid listener", () => {
  const myStore = createStore({});
  const myStore2 = createStore({ data: {} });

  expect(() => myStore.listen("fgfg", undefined)).toThrowError(
    `fgfg is undefined in the store.`
  );
  expect(() => myStore.listen(56, undefined)).toThrowError(
    "Provide a valid event"
  );

  expect(() => myStore2.listen("data", undefined)).toThrowError(
    "Provide a valid callback, a function to be able to listen."
  );

  expect(() => myStore2.listen("fgfg", undefined)).toThrowError(
    `fgfg is undefined in the store.`
  );
});

test("Valid listener", () => {
  const myStore = createStore({
    data: {
      f: {
        data: new Map().set("d", new Set()),
        value: false
      },
      add: (store) => {
        store.f.value = true;
        store.f.data.set("new", true).set("d", new Set().add(45));
      }
    }
  });

  myStore.listen("*", () => null);

  const getListenSpy = vi.fn(myStore.listen);

  const unsubscribeListen = getListenSpy("data", () => null);
  expect(unsubscribeListen).toBeTypeOf("function");
  expect(getListenSpy).toHaveReturned();
  const unsubscribeListenData = getListenSpy("*", () => null);
  const unsSpy = vi.fn(unsubscribeListenData);
  unsSpy();
  expect(unsSpy).toBeCalled();

  const listenCallback = vi.fn((store) => {
    expect(store.value).toBe(true);
  });
  const unsubDatF = myStore.listen("data.f", listenCallback);
  const spyUn = vi.fn(unsubDatF);
  // dispatch
  myStore.dispatcher.data.add();
  // unsubscribe
  spyUn();
  expect(spyUn).toHaveBeenCalled();
  expect(listenCallback).toHaveBeenCalled();
});

test("Test update on listener", () => {
  const myStore = createStore({
    data: 12,
    deep: {
      deep: {
        ok: true,
        mock: "no"
      }
    },
    content: {
      step: {
        value: "yes"
      },
      fine: true
    },
    func: (store, value) => (store.data += value)
  });
  const myGroupStore = createStore({
    group: {
      value: 0,
      func: (store, v) => (store.value += v)
    }
  });
  myStore.listen("data", (store) => {
    expect(store).toBe(13);
  });

  const uns = myGroupStore.listen("group", (store) => {});
  const unsSpy = vi.fn(uns);
  unsSpy();
  expect(unsSpy).toBeCalled();
  myStore.dispatcher.func(1);
});
