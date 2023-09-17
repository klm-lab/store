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

State management for any javascript application. It's small, fast and stable, no boilerplate, no side effects, no
context provider and compatible with SSR. Comes with zero dependencies and lets you dispatch actions from anywhere.
Typescript user or Javascript user, it doesn't matter. It is all for you.<br/>

## Installation

```sh
  npm install aio-store
  ```

<!-- USAGE EXAMPLES -->

## Usage

##### First import createStore

```js
// All users, No hook
import { createStore } from "aio-store";

// React user with hook
import { createStore } from "aio-store/react";
```

### Create a store

When you create a store, you can organize your data or mix it with actions. The choice is yours. But all
actions must be at root level.<br> In your actions, the first parameter
will always be the store reference, his name is yours. If you want to pass other parameters, add them after the first
parameter.

#### Mixed store

```js
export const useExpStore = createStore({
  // a data
  exp: 10,
  // An action
  updateExp: (storeRef, myParam, ...rest) => {
    // storeRef point to {exp: 10, deep: ...}
    storeRef.exp += myParam;
  },
  // a data
  deep: {
    moreDeep: {
      evenDeep: {
        data: "I'm deep"
      }
    }
  },
  updateDeep: (storeRef) => {
    // storeRef point to {exp: 10, deep: ...}
    storeRef.deep.moreDeep.evenDeep.data = "Ok we got you";
  },
  // ...more data
  // ...more actions
});

```

#### Organized store

* We group all data in `data`

```js
export const useExpStore = createStore({
  data: {
    exp: 10,
    working: true,
    deep: {
      moreDeep: {
        evenDeep: {
          data: "I'm deep"
        }
      }
    }
    //...more data
  },
  updateExp: (storeRef) => {
    storeRef.data.exp += 1;
  },
  updateDeep: (storeRef) => {
    storeRef.data.deep.moreDeep.evenDeep.data = "Ok we got you";
  },
  // ...more actions
});
```

* We define all data at root level

```js 
export const useExpStore = createStore({
  exp: 10,
  working: true,
  deep: {
    moreDeep: {
      evenDeep: {
        data: "I'm deep"
      }
    }
  },
  //...more data
  updateExp: (storeRef) => {
    storeRef.exp += 1;
  },
  updateDeep: (storeRef) => {
    storeRef.data.deep.moreDeep.evenDeep.data = "Ok we got you";
  },
  // ...more actions
});
```

#### Promise in actions
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

#### Use the store

At this point, for React users, you can use it in two ways when using hook or by listening to <a href="#events">Events</a>.

Vanilla users can still call the store like this `myStore()` and get all their data. But for realtime update, JUMP here <a href="#events">Events</a>

>[!NOTE]<br>
> Events are available for all platforms, vanilla, React etc...

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

  return <span>{exp}</span>;
};
```

With that MyComponent render if `exp` changes and if any value in `useExpStore` change. Sometimes it is what we want, sometimes not

If the component only listens to specific value changes, it is better to directly connect the component to that value 

```js
//My component

import { useExpStore } from "./store";

const MyComponent = () => {

  // In case of not organized we ask the store to extract exp for us
  const exp = useExpStore("exp");

  // Deeper data
  const deepValue = useExpStore("data.depp.moreDeep");

  return <span>{exp}</span>;
};
```

#### Use your actions

You can call `getActions` to get your actions or use the dispatcher property.<br>
You can use your actions anywhere in your app, inside a component or not.

> Note : <br/>
> Every action is chainable. You can use it like this action().action().actions() and so on.
> Or just call action(). It is totally up to you <br/>

```js
const { putOil } = useCarStore.getActions()
// Or
const { putOil } = useCarStore.dispatcher

// And use it like this

putOil() // or 

putOil().takePassengers().drive() //and so on. depends on you
```

#### Mutation
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

## Events

You can listen to certain store events that allow you to receive updates without rendering your component, or if you are
not using React.<br>
Very useful when you want to update something stateless.

* Listen to change in your store

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
const unsubscribe = myStore.listen('data.someAction', (action) => {
  // do what ever you want with your action,
  // you can also dispatch
})

unsubscribe()
```

## Environment

Skip this step if you are using event listener. Every listener is free from HOOK

* **Client side** <br>
  You have nothing to do. It works like charm.
* **Server side**
    * REMIX APP <br>
      You have nothing to do, It works like charm.
    * NEXT-JS APP<br>
      Add `use client` on a component that connect to the store using hook
  ```js
  "use client"
  import .....
  
  const myData = useMyStore();
  ```
    * For another server side rendering framework, Feel free to open an issue if something happens. I will do my best to
      help you.

## Available tools and options

* `createStore` Let you create a store
* `dispatcher` A property attached to your store that lets you dispatch actions from any file.
* `getSnapshot` A Function attached to your store that lets you get a snapshot of your store at any time.
* `getDataSnapshot` A Function attached to your store that lets you get a snapshot that only contains the data of your store at any time.
* `getActions` A Function attached to your store that lets you get all actions in your store at any time.
* `listen` A Function attached to your store that lets you listen to changes in a specific part of your store.
* `*` A key that can be passed to your store in order to get everything in that store. It is similar to passing
  nothing.

<!-- LICENSE -->

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License. See `LICENSE.txt` for more information.
