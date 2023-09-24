<br />
<div align="center">
<a href="https://github.com/klm-lab/store/#readme" target="_blank">
     <img src="assets/icon.svg" alt="icon" width="120" height="120">
</a>

![version][version-shield]
![dependencies][dependencies-shield]
![size][size-shield]
![MIT License][license-shield]


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

This library makes the creation of a store really simple.

```js
export const useExpStore = createStore({
  exp: 10,
});

```

### Use the store
* **Anywhere in your app**

```js
const store = myStore.get()
```
* **Inside a React component**

```js
import { useExpStore } from "./store";

const MyComponent = () => {

  // Realtime update for React users
  const { exp } = useExpStore();

  // ❗ this is just a snapshot, No realtime changes
  const { exp } = useExpStore.get();

  // ❗ this is just a snapshot, No realtime changes
  const exp = useExpStore.get("exp");

  // Realtime update available for React users
  const { exp } = useExpStore("*");

  // Deeper data with realtime update
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
  // React user or vanilla users
  const snap = myStore.get()
  
  // vanilla users
  const snap = myStore()
  
  const someValue = myStore.get("someValue")
  // do what ever you want with your data,
})

// Listen to specific changes
myStore.listen('data.content.value', (data) => {
  // while listening, you can get a snapshot to do some control
  const snap = myStore.get()
  const someValue = myStore.get("someValue")
  // do what ever you want with your data,
})

```
The listen method returns an unsubscribe function

```js
const unsubscribe = myStore.listen('data', (data) => {})

unsubscribe()
```

### Mutation
All changes you are doing in the store are made in a draft of your store in order to keep your store immutable<br>

Do not mutate store like below. Please be aware that, `storeRef` or whatever the name you call it, is there as a reference to a draft of your real store.
By doing this, it will simply not work. You are destroying the reference but no worries, your real store is still safe.

```js
const myStore = createStore({
  myValue: 10,
})
myStore.set(storeRef => {
  // ❌ Bad, Don't do this
  storeRef = {
    myValue: 11
  }
})

```
Instead, do like following lines

```js
const myStore = createStore({
  myValue: 10,
})

myStore.set(storeRef => {
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
})
```
> [!NOTE]<br/>
> Chainable mutation is supported.

```js
myStore.set(storeRef => {}).set(storeRef => {}) // and so on
```

## Available tools and options

* `createStore` Let you create a store
* `set` A property attached to your store that lets you dispatch actions from any file.
* `get` A Function attached to your store that lets you get a snapshot of your store at any time.
* `listen` A Function attached to your store that lets you listen to changes in all or specific part of your store.
* `*` A key that can be passed to your store in order to get everything or to listen to all changes in your store.

<!-- LICENSE -->

## License

[MIT][license-url]


[size-shield]: https://img.shields.io/bundlephobia/minzip/aio-store?style=for-the-badge
[dependencies-shield]: https://img.shields.io/badge/dependencies-0-green?style=for-the-badge
[license-shield]: https://img.shields.io/github/license/klm-lab/store?style=for-the-badge
[version-shield]: https://img.shields.io/npm/v/aio-store?style=for-the-badge


[license-url]: https://choosealicense.com/licenses/mit/