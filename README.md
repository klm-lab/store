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

<!-- TABLE OF CONTENTS 
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#installation">Installation</a>
    </li>
    <li>
      <a href="#usage">Usage</a>
      <ul>
        <li>
          <a href="#slice-store">Slice store</a>
            <ul>
              <li><a href="#create-a-not-organised-data-store">Not organised data</a></li>
              <li><a href="#create-an-organised-data-store">Organised data</a></li>
              <li><a href="#use-the-store">Use the store</a></li>
              <li><a href="#autocomplete-or-intellisense">Autocomplete or intellisense</a></li>
              <li><a href="#extract-actions-or-data">Extract actions or data</a></li>
              <li><a href="#performance">Performance</a></li>
              <li><a href="#chain-actions-call-issue">Chain actions call issue</a></li>
            </ul>
        </li>
        <li><a href="#group-store">Group store</a></li>
        <li><a href="#external-dispatcher">External dispatcher</a></li>
      </ul>
    </li>
    <li><a href="#license">License</a></li>
  </ol>
</details>-->

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

With that, you can create a store (slice store) or a group of stores.

### Slice store

A slice store is just a part of your store. You can divide your store into several slices, or combine slices into one
large store.<br> When you create a store, you can organize your data or mix it with actions. The choice is yours. But all
actions must be at root level.<br> In your actions, the first parameter
will always be the store reference, his name is yours. If you want to pass other parameters, add them after the first
parameter.

#### Mixed slice store

```js
export const useExpStore = createStore({
  // a data
  exp: 10,
  // An action
  updateExp: (storeRef, myParam, ...rest) => {
    //slice is the store data. {exp: 10, deep: ...}
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
    //slice is the store data. {exp: 10, deep: ...}
    storeRef.deep.moreDeep.evenDeep.data = "Ok we got you";
  },
  // ...more data
  // ...more actions
});

```

#### Organized slice store

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
    //slice is the store data. {exp: 10, deep: ...}
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
    //slice is the store data. {exp: 10, deep: ...}
    storeRef.data.deep.moreDeep.evenDeep.data = "Ok we got you";
  },
  // ...more actions
});

```

### Group of stores

```js
import { createStore } from "aio-store"

// A group that contain modal and notification
export const useGroupStore = createStore({
  // modal slice
  modal: {
    isOpen: false,
    openModal: (modalStore) => {
      modalStore.isOpen = true
    }
  },
  // notification slice
  notification: {
    message: "Empty",
    updateNotificationMessage: (notificationStore) => {
      notificationStore.message = "Hi, I am here to notify you"
    }
  }

})
```
> We do not enforce rules on your store architecture except for actions.
> * First level of your store for a slice,
> * Group-first level for a group of stores.

```js
// ✅ This is good
const sliceStore = {
  ...myData,
  ...myActions,
}
// ✅ This is good. Reversing order is fine
const sliceStore = {
  ...myActions,
  ...myData
}
// ✅ This is good.
const myGroupStore = {
  groupOne: {
    ...groupOneData,
    ...groupOneActions
  },
  groupTwo: {
    ...groupTwoData,
    ...groupTwoActions
  }
}

// ❌ This is bad for sliceStore and will be converted to a group by the system
const sliceStore = {
  ...mydata,
  someData: {
    ...myActions
  },
}

// ❌ This is bad for groupStore and will be converted to a slice by the system
const myGroupStore = {
  groupOne: {
    ...groupOneData,
    ...groupOneActions
  },
  ...myActions
}

export const useStore = createStore(sliceStore | myGroupStore)
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

* `createStore` Let you create a store by passing a slice or a group of data and actions.
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
