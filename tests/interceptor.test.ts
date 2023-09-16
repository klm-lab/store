/* eslint-disable */
// @ts-nocheck
import { expect, test } from "vitest";
import { createStore } from "../src";

test("Interceptors special use case", () => {
  const myStore = createStore({
    gh: {
      data: 8,
      content: null
    },
    value: null,
    deep: {
      md: {
        gt: {}
      }
    },
    mapTest: {
      data: new Set().add(new Set().add(new Set()))
    },
    noLockedEvent: (store: any) => {
      store.deep.md.gt = "new";
      store.deep = "new";
      store.value = "some value";
      delete store.deep;
    }
  });

  myStore.intercept(
    "deep.md",
    ({ interception, allowAction, rejectAction }) => {
      if (interception.preservePath) allowAction();
      else rejectAction();
    }
  );

  myStore.dispatcher.noLockedEvent();

  expect(myStore()).toHaveProperty("deep");
  expect(myStore().deep).toHaveProperty("md");
});
