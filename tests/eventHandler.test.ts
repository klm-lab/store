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
    ERROR_TEXT.NOT_VALID_LISTEN_EVENT
  );

  expect(() => myStore.intercept(56, undefined)).toThrowError(
    ERROR_TEXT.NOT_VALID_INTERCEPT_EVENT
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

  const getListenSpy = vi.fn(myStore.listen);
  const getInterceptSpy = vi.fn(myStore.intercept);
  const unsubscribeListen = getListenSpy("data", () => null);
  const unsubscribeIntercept = getInterceptSpy("*", (s) => s.allowAction());

  expect(unsubscribeListen).toBeTypeOf("function");
  expect(unsubscribeIntercept).toBeTypeOf("function");
  expect(getListenSpy).toHaveReturned();
  expect(getInterceptSpy).toHaveReturned();
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

  const interceptCallback = vi.fn((store) => {
    expect(store).toHaveProperty("intercepted");
    expect(store).toHaveProperty("intercepted.value", 13);
    expect(store).toHaveProperty("intercepted.state");
    expect(store).toHaveProperty("intercepted.key");
    expect(store).toHaveProperty("intercepted.event");
    expect(store).toHaveProperty("allowAction");
    expect(store).toHaveProperty("rejectAction");
    expect(store).toHaveProperty("override.value");
    expect(store).toHaveProperty("override.key");
    expect(store).toHaveProperty("override.keyAndValue");
  });

  myStore.intercept("*", interceptCallback);

  myStore.intercept("content.fine", interceptCallback);
  myStore.intercept("content.step.value", interceptCallback);
  // testing same key
  myStore.intercept("deep.deep.mock", interceptCallback);
  myStore.intercept("deep.deep.mock", interceptCallback);
  // testing one level up key
  myStore.intercept("deep.deep", interceptCallback);

  const uns = myGroupStore.intercept("group", (store) => {});
  const unsSpy = vi.fn(uns);
  unsSpy();
  expect(unsSpy).toBeCalled();
  myStore.dispatcher.func(1);
  expect(interceptCallback.mock.calls.length).toBe(1);
});

test("Test interceptor with same function", () => {
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
    func2: (store) => (store.content = {})
  });

  const interceptCallback = vi.fn((store) => {
    store.allowAction();
  });

  myStore.intercept("*", interceptCallback);
  myStore.intercept("content.fine", interceptCallback);
  myStore.intercept("content.step.value", interceptCallback);

  myStore.dispatcher.func2();
  expect(interceptCallback.mock.calls.length).toBe(1);
});

test("Test interceptor with different function", () => {
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
    func2: (store) => (store.content = {})
  });

  const interceptCallback = vi.fn((store) => {
    store.allowAction();
  });
  const interceptCallback2 = vi.fn((store) => {
    store.allowAction();
  });
  const interceptCallback3 = vi.fn((store) => {
    store.allowAction();
  });

  myStore.intercept("*", interceptCallback);
  myStore.intercept("content.fine", interceptCallback2);
  myStore.intercept("content.step.value", interceptCallback3);

  myStore.dispatcher.func2();
  expect(interceptCallback.mock.calls.length).toBe(1);
  expect(interceptCallback2.mock.calls.length).toBe(1);
  expect(interceptCallback3.mock.calls.length).toBe(0);
});

test("Test interceptor reject", () => {
  const myStore = createStore({
    content: {
      step: {
        value: "yes"
      },
      fine: true
    },
    func2: (store) => (store.content = {})
  });

  const myStore2 = createStore({
    content: {
      step: {
        value: "yes"
      },
      fine: true
    },
    func2: (store) => (store.content = {})
  });

  const interceptCallback = vi.fn((store) => {
    store.allowAction();
  });
  const interceptCallback2 = vi.fn((store) => {
    store.rejectAction();
  });
  const interceptCallback3 = vi.fn((store) => {
    store.allowAction();
  });

  const interceptCallback_1 = vi.fn((store) => {
    store.rejectAction();
  });
  const interceptCallback_2 = vi.fn((store) => {
    store.allowAction();
  });
  const interceptCallback_3 = vi.fn((store) => {
    store.allowAction();
  });

  myStore.intercept("*", interceptCallback_1);
  myStore.intercept("content.fine", interceptCallback_2);
  myStore.intercept("content.step.value", interceptCallback_3);

  myStore.dispatcher.func2();
  expect(interceptCallback_1.mock.calls.length).toBe(1);
  expect(interceptCallback_2.mock.calls.length).toBe(1);
  expect(interceptCallback_3.mock.calls.length).toBe(0);
});

test("Test interceptor with override", () => {
  const myStore = createStore({
    content: {
      step: {
        value: "yes"
      },
      fine: true
    },
    func2: (store) => (store.content.step.value = 10)
  });

  const interceptCallback = vi.fn((store) => {
    store.override.key("hello");
  });
  const interceptCallback2 = vi.fn((store) => {
    store.override.value("20");
  });
  const interceptCallback3 = vi.fn((store) => {
    store.override.keyAndValue("newKey", 60);
  });

  myStore.intercept("*", interceptCallback);
  const unsub = myStore.intercept("content.step", interceptCallback2);
  myStore.intercept("content.step", interceptCallback2);
  myStore.intercept("content.step.value", interceptCallback3);

  myStore.dispatcher.func2();
  expect(interceptCallback.mock.calls.length).toBe(1);
  expect(interceptCallback2.mock.calls.length).toBe(1);
  expect(interceptCallback3.mock.calls.length).toBe(1);
  expect(myStore.getSnapshot().content.step).toHaveProperty("newKey", 60);

  const unsSpy = vi.fn(unsub);
  unsSpy();
  expect(unsSpy).toBeCalled();
});

test("Test interceptor with override only Key", () => {
  const myStore = createStore({
    content: {
      step: {
        value: "yes"
      },
      fine: true
    },
    func2: (store) => (store.content = {})
  });

  const interceptCallback = vi.fn((store) => {
    store.override.key("hello");
  });

  myStore.intercept("*", interceptCallback);

  myStore.getActions().func2();
  expect(interceptCallback.mock.calls.length).toBe(1);
  expect(myStore.getSnapshot()).toHaveProperty("hello", {});
});

test("Test interceptor with override only value", () => {
  const myStore = createStore({
    content: {
      step: {
        value: "yes"
      },
      fine: true
    },
    func2: (store) => (store.content = {})
  });

  const interceptCallback = vi.fn((store) => {
    store.override.value(10);
  });

  myStore.intercept("*", interceptCallback);

  myStore.getActions().func2();
  expect(interceptCallback.mock.calls.length).toBe(1);
  expect(myStore.getSnapshot()).toHaveProperty("content", 10);
});

test("Test interceptor with override key and value", () => {
  const myStore = createStore({
    content: {
      step: {
        value: "yes"
      },
      fine: true
    },
    func2: (store) => (store.content = {})
  });

  const interceptCallback = vi.fn((store) => {
    store.override.keyAndValue("key", 10);
  });

  myStore.intercept("*", interceptCallback);

  myStore.dispatcher.func2();
  expect(interceptCallback.mock.calls.length).toBe(1);
  expect(myStore.getSnapshot()).toHaveProperty("key", 10);
});

test("Test interceptor with override key and value with no params", () => {
  const myStore = createStore({
    content: {
      step: {
        value: "yes"
      },
      fine: true
    },
    func2: (store) => (store.content = {})
  });

  const interceptCallback = vi.fn((store) => {
    store.override.keyAndValue();
  });

  myStore.intercept("*", interceptCallback);

  myStore.getActions().func2();
  expect(interceptCallback.mock.calls.length).toBe(1);
  expect(myStore.getSnapshot()).toHaveProperty("content", {});
});

test("Test interceptor with override key with no params", () => {
  const myStore = createStore({
    content: {
      step: {
        value: "yes"
      },
      fine: true
    },
    func2: (store) => (store.content = {})
  });

  const interceptCallback = vi.fn((store) => {
    store.override.key();
  });

  myStore.intercept("*", interceptCallback);

  myStore.dispatcher.func2();
  expect(interceptCallback.mock.calls.length).toBe(1);
  expect(myStore.getSnapshot()).toHaveProperty("content", {});
});

test("Test interceptor with override value with no params", () => {
  const myStore = createStore({
    content: {
      step: {
        value: "yes"
      },
      fine: true
    },
    func2: (store) => (store.content = {})
  });

  const interceptCallback = vi.fn((store) => {
    store.override.value();
  });

  myStore.intercept("content", interceptCallback);

  myStore.dispatcher.func2();
  expect(interceptCallback.mock.calls.length).toBe(1);
  expect(myStore.getSnapshot()).toHaveProperty("content", {});
});
