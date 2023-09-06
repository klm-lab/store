<br />
<div align="center">
<a href="https://github.com/klm-lab/store/#readme" target="_blank">
     <img src="https://www.svgrepo.com/download/281999/server-database.svg" alt="icon" width="120" height="120">
</a>
</div>

# K-STORE
State management for any javascript application. It's small, fast and stable, no boilerplate, no side effects, no context provider and compatible with SSR. Comes with zero dependencies and lets you dispatch actions from anywhere powered with typescript with strong and deep intellisense support.
Typescript user or Javascript user, it doesn't matter. It is all for you.<br/>

<a align="center" href="https://codesandbox.io/s/store-demo-2lkdw4" target="_blank">View demo</a>   

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
  npm install k-store
  ```

<!-- USAGE EXAMPLES -->

## Usage

##### First import createStore

```js
//Vanilla js
import { createStore } from "k-store";

// React user
import { createStore } from "k-store/react";
```

With that you can create two types of store.
* **Slice store**: A store that mind his own business
* **Grouped store**: A group of slice store.


### Slice store

A slice store is just a part of your store. You can divide your store into several slices, or combine slices into one large
store. When you create a store, you can organize your data or mix it with actions. The choice is yours. But all actions must be at
root level. In your actions, the first parameter
will always be the store data, his name is yours. If you want to pass other parameters, add them after the first parameter. Find out more here:
<a href="#passing-parameter-to-actions">Passing parameters</a>. Let's take the following example


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
As you see, data and actions are mixed together and unordered. It is not a problem it will work 😀

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

At this point, for react users, you can use it by two ways when using hook or by listen to <a href="#events">Events</a>.
Let's get the store and extract the part we want.<br>

Vanilla users JUMP here <a href="#events">Events</a>

```js
import { useExpStore } from "./store";

const MyComponent = () => {

  // we get the store and extract exp
  const { exp } = useExpStore();

  return <span>{exp}</span>;
};
```
With that MyComponent render if `exp` changes and if any value in `useExpStore` change. Sometimes it is what we want, so it is fine.

* Ask `useExpStore` to extract the part you want for you. This is useful if the component will only
  listen to specific value changes. It is usually what most of us want

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
// Optimal way to extract 
const putOil = useCarStore("putOil");

// or default way

const { putOil } = useCarStore()

// And use it like this

putOil() // or 

putOil().takePassengers().drive() //and so on. depends on what you want
```

Both have no impact on performance. Component that only extract action will never rerender if some data change. It is just a dispatcher. But if the same component extract also some data like this
```js
// Extracting action and exp value
const { updateExp, exp } = useExpStore()
```
Then the component will render if `exp` change. <br/>
The optimal way to extract only one action is to do so
```js
const updateExp = useExpStore("updateExp")
```
This is really optimal for extracting one action because no subscription is added and `useExpStore` is used are as PURE DISPATCHER.

* Extract all actions or all data <br>
  Sometimes we want to extract all the data without the actions, and vice versa. You can proceed as follows

```js
// extract all actions with optimal way
// Making useExpStore PURE DISPATCHER 
const allActions = useExpStore("_A");
// allActions.updateExp().doSomethingElse().updateExp()


// extract all actions with default way
const { actions1, actions2, ...etc } = useExpStore();
// action1().actions2().doSomethingElse().action1()

// extract all data with PURE DATA CONSUMER
const allData = useExpStore("_D")
// console.log(allData.exp)

```

❗❗❗ Component will render when something change in the data when you extract all data. Even if the component does not consume all of that data <br/>
Extract all data only if the Component consume all of it, else extract the desired part

#### Performance

Even if you call your action or chain of actions 1000 times in a single click or once, you'll only get one rendering of your component, not 1000 renderings. This applies to synchronous actions. Asynchronous actions render the component when they are ready.
We cannot wait for all asynchronous actions to finish before rerender

#### Optimisation

Usually in any react based app `process.env.NODE_ENV` is already exposed. And if so it is good for you because
you are going to get the smallest and fastest version of this library.<br/>
if `process.env.NODE_ENV` is not exposed, expose it your self depending on tools you are using. <br/>
* Maybe webpack `--env.NODE_ENV="production"` when you are building your project
* Maybe cross-env `cross-env NODE_ENV=production` when you are building your project
* Or whatever the tools you are using

#### Security 

Do not mutate store like that. You will override the reference with a new object and break the store.
Keep this in mind, slice or whatever the name you call it, is there as a reference of your real store.
```js
const useStore = createStore({
  myValue: 10,
  setData: (slice) => {
    // ❌ Bad, Don't do for security and integrity reason.
    slice = {
      myValue: 11
    }
  }
})
```

`slice` is there as reference to your store. Do not override the reference. Do like following lines
```js
const useStore = createStore({
  myValue: 10,
  setData: (slice) => {
    // ✅ Good,
    slice.MyValue = 11
    // ✅ Good,
    slice.MyValue = { 
     // ...whatever you want
    }
    // ✅ Good, you can add new Props
    slice.newProp = {
      // ...whatever you want
    }
    // ✅ Good,
    slice.props.data = {
      someData: someValue
      // ...whatever you want
    }
    // ✅ Good,
    slice.props.data.someData += someValue
  }
})
```

#### Chain actions call issue

Use chain actions with caution when using promises. Without promises, there's no risk. Enjoy. But with promises,
Make sure that when call them each action updates a different part
of your store and not the same one. Or combine the logic of the actions. For example: 

```js
const store = createStore({
  value: 12,
  updateValue: async (slice) => {
    // setSomeData is slow api and finish in 1 second
    const res = await setSomeData();
    console.log(res) // <---- 20
    // ❗ risky, we are updating value in an async operation while another action is doing the same
    slice.value = res
  },
  resetValue: async (slice) => {
    // resetSomeData is fast api and finish in 1ms
    const res = await resetSomeData();
    console.log(res) // <---- 0
    // ❗ risky, we are updating value in an async operation while another action is doing the same
    slice.value = res
  }
})
```

It is risky if we call both actions at the same moment. If we call one by one based on event or something else, It is fine.
But here

* We can convert action to synchronous, but it is not what we want.
* We can change different part of store, `updateValue` changes `value` and `resetValue` changes another prop. But maybe
  it's not what we want
* We can merge both logic in one action. This is the best thing to do here

Both functions `updateValue` and `resetValue` change the same data `slice.value`. This is why we want to combine
actions. <br>
If they do not change same property, we can chain like we want even with async actions, no risk at all. But in our case, using chain give this
result

```js
// calling in this order
updateValue().resetValue() // <--- output 20

// calling in this order . We reverse the order
resetValue().updateValue() // <--- output 20
```

* The revers calling `resetValue().updateValue()` match our expectation, because we first reset and then update.
  It is fine but still dangerous because we can not guarantee the response time of the api.
* The default calling `updateValue().resetValue()` output `20`. because `resetValue` finish faster than `updateValue` and
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

A group store is a group of multiple slice. To create it call the same api `createStore` like that

```js
import { createStore } from "k-store"

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

To use it, just do the same thing as a slice. Since it is a group, it is not advised to extract the
whole group unless you know what you are doing. Intellisense will be there to help you. No need to memoize your store.<br>

Vanilla users JUMP to <a href="#events">Events</a>

```js
const MyComponent = () => {

  // connecting to the group
  const groupStore = useGroupStore();
  
  // connecting to modal data with actions
  const modalStore = useGroupStore("modal");
  
  // connecting to notification data with actions
  const notificationStore = useGroupStore("notification")
}
```

You can also connect your component to nested data in the store like that.

```js
const modalIsOpen = useGroupStore("modal.isOpen")
const notificationMessage = useGroupStore("notification.message")
```

Or get all modalActions making `useGroupStore` PURE DISPATCHER

```js
// all modal actions without data
// this is a PURE DISPATCHER
const modalActions = useGroupStore("modal._A")

// specific modal action with PURE DISPATCHER
const openModal = useGroupStore("modal.openModal")
```

Or get all data

```js
// all modal data without actions
const modalActions = useGroupStore("modal._D")

// specific modal data
const openModal = useGroupStore("modal.isOpen")
```

> We do not enforce rules on you store architecture except for actions who must be at root or first level of your store.
```js
// ✅ This is good                       // ✅ This is good. Reversing order is fine
const sliceStore = {            |        const sliceStore = {
  ...myData,                    |             ...MyActions,
  ...myActions                  |             ...myData
}                               |        }
-------------------------------------------------------------------------------------------

// ✅ This is good.
const myGroupStore = {
  groupOne: {
    ...groupOneData,
    ...groupOneActions
  },
  groupTwo:{
    ...groupTwoData,
    ...groupTwoActions
  }
}

// ❌ This is bad for sliceStore and will be converted to a group by the system
const sliceStore = {
  ...Mydata,
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
 
> If we found an action at root level, we create a slice with that action and ignore all other actions
> If we found an action at next level, we create a group if no actions are present in root level and ignore all other actions.
> Any very deep level actions will be ignored. you can do what you want with them ,but they will dispatch nothing
> * Group store: actions inside the group root level,
> * Slice store, actions at root level

You also have access to an external dispatcher which can be use anywhere in your app. Inside a component or not,
inside a hook or not.

## External dispatcher
 
> NOTE: It works for group or slice store.

```js
export const useStore = createStore(...);

```

Now you can consume data and dispatch actions
```js

// This is a PURE DISPATCHER
export const GlobalDispatcher = useStore.dispatcher

// Consume your store like before
const {someData} = useStore();

// PURE DISPATCHER
const actions = useStore("groupKey._A");

// and so on
```

Use the `useStore` in any component like before. Nothing changes. Extract what you want from the store , data, actions, whatever ...

But now you are able to dispatch action from `GlobalDispatcher` and from any file like this

```js
import GroupGlobalDispatcher from "where_ever_it_is";

//or

import SliceGlobalDispatcher from "where_ever_it_is";

// from a slice store
SliceGlobalDispatcher.someAction().action().action(); //  and so on

// From a group: EX: modal
GroupGlobalDispatcher.modal.action().action(); // and so on

// From a group: EX: yourGroupKey
GroupGlobalDispatcher.yourGroupKey.action().action(); //  and so on
```

## Events

You can listen to certain store events that allow you to receive updates without rendering your component. Or if you are not using react.
Very useful when you want to update something stateless. We all hate unnecessary rendering 😀.

* Listen to `change` event. <br/>
**change event** is available for both. Group and slice stores. But keep this in mind. You will receive an update for all changes in the store,
```js
const myStore = createStore(...);

myStore.on('change',(store) => {
  // do whatever you want,
})
```
The store you have received contains everything you need to consume or dispatch data.

* Listen to specific event. Every key in your store is an event, except for the actions, which are a little different.
```js
const myStore = createStore(...);

myStore.listenTo('data.content.value',(data) => {
  // do what ever you want with your data,
})
```

You can also listen to actions and be informed when it is triggered.
```js
const myStore = createStore(...);

myStore.listenTo('data.someAction',(action) => {
  // do what ever you want with your action,
  // you can also dispatch
})
```

All event listener return an unsubscribe function
```js
const unsubscribe = myStore.listenTo('data.someAction',(action) => {
  // do what ever you want with your action,
  // you can also dispatch
})

unsubscribe()
```

And you can also listen to all Data or all actions
```js
// Listen to all Data changes
myStore.listenTo('_D',(action) => {
  // do some stuff with your data
})

// Listen to all Data changes
myStore.listenTo('_A',(action) => {
  // do what ever you want with your action,
  // you can also dispatch
})
```

Or if your store is a group. See create a group store  <a href="#group-store">HERE</a>
```js
// Listen to all Data changes
myStore.listenTo('groupKey._D',(action) => {
  // do some stuff with your data
})

// Listen to all Data changes
myStore.listenTo('groupKey._A',(action) => {
  // do what ever you want with your action,
  // you can also dispatch
})
```

## Environment

Skip this step if you are using event listener. Even listener are free from HOOK
* **Client side** <br>
You have nothing to do. It works like charm.
* **Server side** 
  * REMIX APP <br>
  You have nothing to do, It works like charm.
  * NEXT-JS APP<br>
  Add `use client` on component that connect to the store using hook
  ```js
  "use client"
  import .....
  
  const myData = useMyStore();
  ```
  * For other server side rendering framework, Feel free to open an issue if something happens. I will do my best to help you.

## Available tools and options

* `createStore` Let you create a store by passing a slice or a group of data and actions.
* `_A` A key that can be passed to your slice store in order to get a PURE DISPATCHER with all actions in that store.
* `groupKey._A` A key that can be passed to your grouped store in order to get a PURE DISPATCHER with all actions in that store.
* `._D` A key that can be passed to your slice store in order to get all data in that store making it a PURE DATA CONSUMER.
* `groupKey._D` A key that can be passed to your grouped store in order to get all data in that store making it a PURE DATA CONSUMER.

<!-- LICENSE -->

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License. See `LICENSE.txt` for more information.
