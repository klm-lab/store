<br />
<div align="center">
<a href="https://github.com/klm-lab/store/#readme" target="_blank">
     <img src="assets/icon.svg" alt="icon" width="120" height="120">
</a>
<div>
<a align="center" href="https://codesandbox.io/s/store-demo-2lkdw4" target="_blank">View React demo</a> |
<a align="center" href="https://codesandbox.io/s/vanilla-demo-2mwpsl" target="_blank">View Vanilla demo</a>
</div>
</div>

# AIO-STORE

State management for any javascript application. It's tiny, fast, stable, contains no boilerplate, has no side effects, doesn't need a
context provider and compatible with SSR.<br>
It comes with zero dependencies and lets you dispatch actions from anywhere.
Typescript user or Javascript user, it doesn't matter. It is all for you.<br/>

## Installation

```sh
  npm install aio-store
  ```

<!-- USAGE EXAMPLES -->

## Usage

Let's import `createStore`

```js
// All users, No hook
import { createStore } from "aio-store";

// React user with hook
import { createStore } from "aio-store/react";
```

### Create a store

This library makes the creation of a store really simple. When you create a store, in your actions, the first parameter
will always be the store reference, his name is yours. If you want to pass other parameters, add them after the first
parameter.

```js
export const useExpStore = createStore({
  exp: 10,
  updateExp: (storeRef, myParam, ...rest) => {
    // storeRef point to {exp: 10, deep: ...}
    storeRef.exp += myParam;
  },
});

```

### Actions with Promises
Just act when you are ready
```js
const useStore = createStore({
  myValue: 10,
  setData: async (storeRef) => {
    const value =  await callingServer();
    storeRef.myValue = value
  }
})
```

### Use the store
* **Anywhere in your app**

```js
const store = myStore.getSnapshot()
```
* **Inside a component**

```js
import { useExpStore } from "./store";

const MyComponent = () => {

  // Realtime changes available for React users
  const { exp } = useExpStore();

  // ❗ this is just a snapshot, No realtime changes
  const { exp } = useExpStore.getSnapshot();

  // ❗ this is just a snapshot, No realtime changes
  const exp = useExpStore.getSnapshot("exp");

  // Realtime changes available for React users
  const { exp } = useExpStore("*");

  // Deeper data
  const deepValue = useExpStore("data.depp.moreDeep");

  return <span>{exp}</span>;
};
```
* **With listener**

You can listen to your store changes anywhere in your app and update something stateless.<br>
Very useful when you want to eliminate unnecessary rendering.

```js
const myStore = createStore(...);

// Listen to all changes
myStore.listen('*', (data) => {
  // while listening, you can get a snapshot to do some control
  // React user
  const snap = myStore.getSnapshot()
  // No hook users
  const snap = myStore()
  
  const someValue = myStore.getSnapshot("someValue")
  // do what ever you want with your data,
})

// Listen to specific changes
myStore.listen('data.content.value', (data) => {
  // while listening, you can get a snapshot to do some control
  const snap = myStore.getSnapshot()
  const someValue = myStore.getSnapshot("someValue")
  // do what ever you want with your data,
})

```
All event listener return an unsubscribe function

```js
const unsubscribe = myStore.listen('data', (data) => {})

unsubscribe()
```

### Use your actions

You can get your actions through the `actions` property and use them anywhere in your app, inside a component or not.

> Note : <br/>
> Every action is chainable. You can use it like this action().action().actions() and so on.
> Or just call action(). It is totally up to you <br/>

```js
// Or
const { putOil } = useCarStore.actions

const putOil  = useCarStore.actions.putOil

// And use it like this

putOil() // or 

putOil().takePassengers().drive() //and so on. depends on you
```

### Mutation
All changes you are doing in the store in made in a draft of your store in order to keep your store immutable<br>

Do not mutate store like below. Please be aware that, `storeRef` or whatever the name you call it, is there as a reference to a draft of your real store.
By doing this, it will not work. You are destroying the reference but no worries, your real store is still safe.

```js
const useStore = createStore({
  myValue: 10,
  setData: (storeRef) => {
    // ❌ Bad, Don't do this
    storeRef = {
      myValue: 11
    }
  }
})
```
Instead, do like following lines

```js
const useStore = createStore({
  myValue: 10,
  setData: (storeRef) => {
    // ✅ Good,
    storeRef.MyValue = 11
    // ✅ Good,
    storeRef.MyValue = {
      // ...whatever you want
    }
    // ✅ Good, you can add new Props
    storeRef.newProp = {
      // ...whatever you want
    }
    // ✅ Good,
    storeRef.props.data = {
      someData: someValue
      // ...whatever you want
    }
    // ✅ Good, if props.data already exists
    storeRef.props.data.someData += someValue
  }
})
```

## Available tools and options

* `createStore` Let you create a store
* `actions` A property attached to your store that lets you dispatch actions from any file.
* `getSnapshot` A Function attached to your store that lets you get a snapshot of your store at any time.
* `listen` A Function attached to your store that lets you listen to changes in all or specific part of your store.
* `*` A key that can be passed to your store in order to get everything in that store. It is similar to passing
  nothing.

<!-- LICENSE -->

## License

[MIT](https://choosealicense.com/licenses/mit/)
