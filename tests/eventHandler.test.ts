/* eslint-disable */
// @ts-nocheck
import { createStore } from "../src";
import { test, expect, vi } from "vitest";
import { E_T, ERROR_TEXT } from "../src/constants/internal";

test("Invalid listener", () => {
  const myStore = createStore({});
  const myStore2 = createStore({ data: {} });
  expect(() => myStore.on("lala")).toThrowError(ERROR_TEXT.NOT_CHANGE_EVENT);
  expect(() => myStore.on("change")).toThrowError(
    ERROR_TEXT.NOT_VALID_CALLBACK
  );
  expect(() => myStore.on("change", undefined)).toThrowError(
    ERROR_TEXT.NOT_VALID_CALLBACK
  );
  expect(() => myStore.listen("fgfg", undefined)).toThrowError(
    ERROR_TEXT.STORE_PROPERTY_UNDEFINED.replace(E_T, "fgfg")
  );
  expect(() => myStore.listen(56, undefined)).toThrowError(
    ERROR_TEXT.NOT_VALID_EVENT
  );
  expect(() => myStore2.listen("fgfg", undefined)).toThrowError(
    ERROR_TEXT.STORE_PROPERTY_UNDEFINED.replace(E_T, "fgfg")
  );
  expect(() => myStore.intercept("fgfg", undefined)).toThrowError(
    ERROR_TEXT.STORE_PROPERTY_UNDEFINED.replace(E_T, "fgfg")
  );
  expect(() => myStore2.intercept("fgfg", undefined)).toThrowError(
    ERROR_TEXT.STORE_PROPERTY_UNDEFINED.replace(E_T, "fgfg")
  );
});

test("Valid listener", () => {
  const myStore = createStore({ data: {} });
  const getChangeSpy = vi.fn(myStore.on);
  const getListenSpy = vi.fn(myStore.listen);
  const getInterceptSpy = vi.fn(myStore.intercept);
  const unsubscribeChange = getChangeSpy("change", () => null);
  const unsubscribeListen = getListenSpy("data", () => null);
  const unsubscribeListenD = getListenSpy("data._D", () => null);
  const unsubscribeListenD2 = getListenSpy("_D", () => null);
  const unsubscribeListenA = getListenSpy("data._A", () => null);
  const unsubscribeIntercept = getInterceptSpy("*", () => null);
  expect(unsubscribeChange).toBeTypeOf("function");
  expect(unsubscribeListen).toBeTypeOf("function");
  expect(unsubscribeIntercept).toBeTypeOf("function");
  expect(unsubscribeListenD).toBeTypeOf("function");
  expect(unsubscribeListenD2).toBeTypeOf("function");
  expect(unsubscribeListenA).toBeTypeOf("function");
  expect(getChangeSpy).toHaveReturned();
  expect(getListenSpy).toHaveReturned();
  expect(getInterceptSpy).toHaveReturned();
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
  myStore.on("change", (store) => {
    expect(store).toMatchObject({ data: 13 });
  });
  myStore.listen("data", (store) => {
    expect(store).toBe(13);
  });

  const interceptCallback = (store) => {
    expect(store).toHaveProperty("intercepted");
    expect(store).toHaveProperty("intercepted.value");
    expect(store).toHaveProperty("intercepted.state");
    expect(store).toHaveProperty("intercepted.key");
    expect(store).toHaveProperty("intercepted.event");
    expect(store).toHaveProperty("allowAction");
    expect(store).toHaveProperty("rejectAction");
    expect(store).toHaveProperty("override.value");
    expect(store).toHaveProperty("override.key");
    expect(store).toHaveProperty("override.keyAndValue");
  };

  myStore.intercept("*", interceptCallback);
  myStore.intercept("_D", interceptCallback);

  myStore.intercept("content.fine", interceptCallback);
  myStore.intercept("content.step.value", interceptCallback);
  // testing same key
  myStore.intercept("deep.deep.mock", interceptCallback);
  myStore.intercept("deep.deep.mock", interceptCallback);
  // testing one level up key
  myStore.intercept("deep.deep", interceptCallback);
  myGroupStore.intercept("_D", (store) => {});
  const uns = myGroupStore.intercept("group._D", (store) => {});
  const unsSpy = vi.fn(uns);
  unsSpy();
  expect(unsSpy).toBeCalled();
  myGroupStore.intercept("group._A", (store) => {});
  myStore().func(1);
  // expect(g.mock.calls.length).toBe(1);
});
