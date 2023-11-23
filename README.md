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

Just create your store, No actions is needed

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

  // Deep data with realtime update
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
  // while listening, you can get a snapshot
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
Your store is immutable, you will always get a fresh store.<br>
When you mutate your store, Please be aware that, `storeRef` or whatever the name you call it, point to a reference of your store.<br>
So do not override the reference.

#### Mutate Object

```js
const myStore = createStore({
  myValue: 10,
})
myStore.set(storeRef => {
  // ❌ Bad, Don't do this.
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

#### Mutate Array
```js
const myStore = createStore({
  arr: [{name: "default"}],
})

myStore.set(storeRef => {
  // Mutation inside the array
  storeRef.arr[0].name = "New name";
  storeRef.arr.push("new item")
// Mutation with new array or clean the array
  storeRef.arr.length = 0
  // Or 
  storeRef.arr = []
})
```

#### Mutate Map / Set
```js
const myStore = createStore({
  map: new Map(),
  set: new Set(),
  setContainsMap: new Set().add(new Map()),
  mapContainsSet: new Map().set("mySet",new Set()),
})
// Mutation inside the array
myStore.set(storeRef => {
  // Mutation inside a map
  storeRef.map.set("new Key", "new value")
  // Mutation inside a set
  storeRef.set.add("new value")
  // Mutation inside setContainsMap
  storeRef.setContainsMap.forEach(s => {
    // S is a Map
    s.set("new Key", "new value")
  })
  // Mutation inside mapContainsSet
  storeRef.mapContainsSet.get("mySet").add("new Value")
  // Cleaning
  storeRef.mapContainsSet.clear()
  storeRef.setContainsMap.clear()
})
```
#### Transferring the ref
When you do not want to repeat yourself, It is useful to save a reference of the updated part and use it multiple times.<br>
But always take care of not destroying that reference

```js
const myStore = createStore({
  data: {
    deep: {
      moreDeep: {}
    }
  }
})

myStore.set(storeRef => {
  const moreDeep = storeRef.data.deep.moreDeep;
  
  // Use moreDeep ✅
  moreDeep.newProp1 = "new value 1"
  moreDeep.newProp2 = "new value 2"

  let deep = storeRef.data.deep;

  // Use moreDeep ✅
  deep.moreDeep = {
    newProp1: "new value 1",
    newProp2: "new value 2"
  }

  let moreDeep = storeRef.data.deep.moreDeep;
  
  // ❌ you are destroying the reference.
  // ❌ moreDeep is not pointing anymore the real moreDeep.
  // ❌ It has a new reference
  moreDeep = {
    newProp1: "new value 1",
    newProp2: "new value 2"
  }
  // But This is fine ✅
  // Because the storeRef is in charge
  storeRef.data.deep.moreDeep = {
    newProp1: "new value 1",
    newProp2: "new value 2"
  }
})
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


[size-shield]: https://img.shields.io/bundlephobia/minzip/aio-store/2.4.41?style=for-the-badge
[dependencies-shield]: https://img.shields.io/badge/dependencies-0-green?style=for-the-badge
[license-shield]: https://img.shields.io/github/license/klm-lab/store?style=for-the-badge
[version-shield]: https://img.shields.io/npm/v/aio-store?style=for-the-badge


[license-url]: https://choosealicense.com/licenses/mit/