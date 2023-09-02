<br />
<div align="center">
<a href="https://github.com/klm-lab/store/#readme" target="_blank">
     <img src="https://www.svgrepo.com/download/281999/server-database.svg" alt="icon" width="120" height="120">
</a>
</div>

# @klm-lab/store
State management in pure, super-typed javascript with typescript powered by Proxy and REACT.
If you trust `useState`, then you trust this library. It's built around react's `useState` hook.
Getting an update is as easy as updating a state. All necessary action is handled by the library to assure that your component only render when really needed

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
  npm install @klm-lab/store
  ```

<!-- USAGE EXAMPLES -->

## Usage

### Slice store

A store slice is just one part of your store. You can divide your store into several slices, or combine slices into one large
store. When you create a store in slices, you can organize your data or mix it with actions. The choice is yours. But all actions must be at
root level. In your actions, the first parameter
will always be the store data, his name is yours. If you wish to pass other parameters, add them after the first parameter. Find out more here:
<a href="#passing-parameter-to-actions">Passing parameters</a>. Let's take the following example

##### First import createStore

```js
import { createStore } from "@klm-lab/store";
```

#### Create a not organised data store

```js
export const useExpStore = createStore({
  // a data
  exp: 10,
  deep: {
    moreDeep: {
      evenDeep: {
        data: "I'm deep"
      }
    }
  },
  // An action
  updateExp: (slice) => {
    //slice is the store data. {exp: 10, deep: ...}
    slice.exp += 1;
  },
  // a data
  working: true,
  updateDeep: (slice) => {
    //slice is the store data. {exp: 10, deep: ...}
    slice.deep.moreDeep.evenDeep.data = "Ok we got you";
  },
  // ...more data
  // ...more actions
});

```
As you see data and actions are mixed together and are unordered. It is not a problem il will work 😀

#### Create an organised data store

You can write all data at root level, followed by actions, or group your data like this

* Organised slice with grouped data

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
  updateExp: (slice) => {
    slice.data.exp += 1;
  },
  updateDeep: (slice) => {
    //slice is the store data. {exp: 10, deep: ...}
    slice.data.deep.moreDeep.evenDeep.data = "Ok we got you";
  },
  // ...more actions
});
```

* Organised slice with data at root level

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
  updateExp: (slice) => {
    slice.exp += 1;
  },
  updateDeep: (slice) => {
    //slice is the store data. {exp: 10, deep: ...}
    slice.data.deep.moreDeep.evenDeep.data = "Ok we got you";
  },
  // ...more actions
});

```

#### Use the store

At this point your store is a hook and can only be used inside a React component in two ways.

* Get the store and extract the part you want.

```js
import { useExpStore } from "./store";

const MyComponent = () => {

  // we get the store and extract exp
  const { exp } = useExpStore();

  return <span>{exp}</span>;
};
```

* Ask `useExpStore` to extract the part you want for you. This will improve performance. Because the component will only
  listen to extracted value changes.

```js
//My component

import { useExpStore } from "./store";

const MyComponent = () => {

  // In case of not organised we ask the store to extract exp for us
  const exp = useExpStore("exp");

  // In case of grouped data ,we ask the store to extract exp for us like this
  const exp = useExpStore("data.exp");

  return <span>{exp}</span>;
};
```

#### Autocomplete or IntelliSense

With the help of typescript, autocompletion or intellisense, you don't need to memorize the order of your data.

<img src="assets/autocomplete.png" alt="icon" width="100%" height="auto">

#### Extract actions or data

You can also extract your actions in the same way, but at root level. Extract the actions yourself or asking the store to do that,
has no impact on performance.

> Note : <br/> 
> Every action is chainable. You can use it like this action().action().actions() and so on.
> OR just call action(). It is totally up to you <br/>

* Extract one action

```js
 const updateExp = useExpStore("updateExp");

// or

const { updateExp } = useExpStore()

// And use it like this

updateExp() // or 

updateExp().otherActions().updateExp() //and so on. depends on what you want
```

* Extract all actions or all data <br>
  Sometimes we want to extract all the data without the actions, and vice versa. You can proceed as follows

```js
// extract all actions
const allActions = useExpStore("_A");
allActions.updateExp().doSomethingElse().updateExp()

// extract all data
const allData = useExpStore("_D")
// console.log(allData.exp)

```

❗❗❗ Component will render when something change in the data when you extract all data. Even if the compoent does not consume all of that data ❗❗❗ <br/>
Extract the all data only if the Component consume all of it, else extract the desired part

#### Performance

Even if you call your action or chain of actions 100 times in a single click or once, you'll only get one rendering of your component, not 100 renderings. This applies to synchronous actions. Asynchronous actions render the component when they are ready.
We cannot wait for all asynchronous actions to finish before render

#### Chain actions call issue

Use chain actions with caution when using promises. Without promises, there's no risk. Enjoy. But with promises,
Make sure that each action updates a different part
of your store and not the same one. Or combine the logic of the actions. For example.

```js
const store = createStore({
  value: 12,
  updateValue: async (slice) => {
    // setSomeData is slow api and finish in 1 second
    const res = await setSomeData();
    console.log(res) // <---- 20
    // ❌ bad, we are updating value in an async operation while another action is doing the same
    slice.value = res
  },
  resetValue: async (slice) => {
    // resetSomeData is fast api and finish in 1ms
    const res = await resetSomeData();
    console.log(res) // <---- 0
    // ❌ bad, we are updating value in an async operation while another action is doing the same
    slice.value = res
  }
})
```

* We can convert action to synchronous, but it is not what we want.
* We can change different part of store, `updateValue` changes `value` and `resetValue` changes another prop. But maybe
  its not what we want
* We can merge both logic in one action. This is the best thing to do here

Both functions `updateValue` and `resetValue` change the same data `slice.value`. That is why we want combine
actions. <br>
If they does not change same, we can chain like you want even with async, no risk at all. But in our case, using chain give this
result

```js
// calling in this order
updateValue().resetValue() // <--- output 20

// calling in this order . We reverse the order
resetValue().updateValue() // <--- output 20
```

* The revers calling `resetValue().updateValue()` match our expectation, because we first reset and then update.
  It is fine but still dangerous because we can not guarantee the response time of the api.
* The default calling `updateValue().resetValue()` output `20`. because resetValue finish faster than updateValue and
  nothing was reset. In
  fact none of these is safe. Below the correct way to achieve what we want

```js
const store = createStore({
  value: 12,
  updateAndResetValue: async (slice) => {
    await setSomeData();
    const res = await resetSomeData();
    console.log(res) // <---- 0
    // ✅ correct, we changes the value only once.
    slice.value = res
  },
})
```
> 🛑 You can change the same value in multiple actions when these actions are synchronous. <br/>
> 🛑 It is not recommended to change the same value in multiple actions when these actions or one of them are asynchronous.

We group all actions in one promise and handle every change in the correct order in order to get the correct output: `0`

#### Passing parameter to actions

To finish with actions you can pass whatever you want to your actions like this

```js
const store = createStore({
  value: 12,
  updateValue: (slice, params1, params2, ...rest) => {
    slice.value = params1 | params2 // or one of rest
  },
})

// Then call it like this
updateValue(params1, params2, otherParams)
```

### Group store

A group store is a pack of multiple slice. To create it call the same api `createStore` like that

```js
import { createStore } from "@klm-lab/store"

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
  // this part is important, we pass a second arg to tell creatStore that it is a group not a slice
}, { storeType: "group" })
```

To use it just do the same thing as a slice with an extra step. Since it is a group, it is not advised to extract the
whole group. So `useGroupStore` will force you to provide a specific target <br/>
`modal` or `notification`. Again intellisense will be there to help you. No need to memoize your store

```js
const MyComponent = () => {
  // connecting to modal data (contain actions)
  const modalStore = useGroupStore("modal");
  // connecting to notification data (contain actions)
  const notificationStore = useGroupStore("notification")
}
```

You can also connect your component to nested data in the store like that.

```js
const modalIsOpen = useGroupStore("modal.isOpen")
const notificationMessage = useGroupStore("notification.message")
```

Or get all modalActions

```js
// all modal actions without data
const modalActions = useGroupStore("modal._A")
// specific modal action
const openModal = useGroupStore("modal.openModal")
```

Or get all data

```js
// all modal data without actions
const modalActions = useGroupStore("modal._D")
// specific modal data
const openModal = useGroupStore("modal.isOpen")
```

#### ❗ Attention `_A` and `_D` does not work on grouped store without being prefixed with whatever the name of a slice in the group.<br/>
#### EX: (modal._A, yourSlice._A, etc...). Same thing for _D.
#### _A, _D, works fine for slice. and groupKey._A, groupKey._D works fine for group

This library does not allow you to extract all data at once in a groupStore. We want your component to mind his own
business, So extract the data you need.
But you can have access to an external dispatcher which can be use anywhere in your app. Inside a component or not,
inside a hook or not.

## External dispatcher

To get it add a second options to `createStore`. 
> NOTE: It works for group or slice store.

```js
const storeWithExternalDispatcher = createStore(yourSliceStore | yourGroup,{
  dispatchMode: "everywhere"
})
```
> NOTE <br/>
> `dispatchMode` support two values : `everywhere` & `hook` <br/>
> `storeType` support two values : `group` & `slice`;

With `everywhere` mode enabled for the dispatcher, here is the new way to consume data and dispatch actions
```js

export const useStore = storeWithExternalDispatcher.useStore;

export const GlobalDispatcher = storeWithExternalDispatcher.dispatcher;

// Consume your store like before
const {someData} = useStore();
```

Use the `useStore` in any component like before. Nothing changes. Extract what you want from the store , data, actions, whatever ...

But now you are able to dispatch action from `GlobalDispatcher` too from any file like this

```js
import GlobalDispatcher from "where_ever_it_is";

// from a slice store
GlobalDispatcher.someAction().action().action() //  and so on

// From a group: EX: modal & notification

GlobalDispatcher.modal.action().action() // and so on
//or
GlobalDispatcher.notification.action().action() //  and so on
```

## Available tools and options

* `createStore` let you create a store by passing a slice or a group of data and actions.<br/><br/>
* `storeOptions` an object with two options `storeType` and `dispatchMode`. If wanted need to be passed as a second argument of `createStore` <br/><br/>
* `storeType`: A property of `storeOptions` which support two values `group` & `slice`.<br/><br/>
* `dispatchMode`: A property of `storeOptions` which support two values `hook` & `everywhere`.<br/><br/>
* `_A`: A key that can be passed to your slice `useStore` to get all actions in that store.<br/><br/>
* `groupKey._A`: A key that can be passed to your grouped `useStore` to get all actions in that store.<br/><br/>
* `._D`: A key that can be passed to your slice `useStore` to get all data in that store.<br/><br/>
* `groupKey._D`: A key that can be passed to your grouped `useStore` to get all data in that store

<!-- LICENSE -->

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License. See `LICENSE.txt` for more information.
