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

## Interceptors

Interceptors are firstly designed to keep sensitive data of your store safe unless you decided otherwise.<br>
But you can also use them for controls. It is up to you.
>[!IMPORTANT]<br>
> By default, all interceptors allow actions

With them, you can :

* Allow an action (update or deletion of the intercepted path)
* Reject an action (update or deletion of the intercepted path
* Override an action (update or deletion)
    * Override by key
    * Override by value
    * Override by key and value

Please use them with caution.<br>
They are designed to be fired on any change that would compromise their sensitive data.<br>
Do not use them to update the UI, instead use <a href="#events">EVENTS</a> or
<a href="#use-the-store">YOUR STORE</a>
> [!IMPORTANT]  
> Never use interceptors to update your UI. Interceptors are safety provider and are fired on sensitive data changes

### Add an interceptor

```js
// If you want to unsubscribe later
const unsubscribe = myStore.intercept("data.value", (store) => {
  console.log(store.interception)
})

// if you do not want to unsubscribe later
myStore.intercept("data.value", (store) => {
  console.log(store.interception)
})
```
`store.interception` contains the intercepted data listed below:

* `interception.key`: Target key, (the key of the data that request changes)
* `interception.value`: The new value
* `interception.update`: The draft store that is updated.
* `interception.preservePath`: Tell you if the path you intercept is preserved during the update
  * Ex: you intercept `data.content` and suddenly `data` becomes `5`. The path is broken because `content` no longer exists.
* `interception.action`: The intercepted action:
  * `update`: When you want to update something in your store
  * `addInSet`: When you want to add something to a Set collection in your store
  * `setInMap`: When you want to set something to a Map collection in your store
  * `delete`: When you want to delete something in your store
  * `deleteInSet`: When you want to delete something from a Set collection in your store
  * `deleteInMap`: When you want to delete something from a Map collection in your store
  * `clearInSet`: When you want to clear a Set collection in your store
  * `clearInMap`: When you want to clear a Map collection in your store
* `interception.event`: The intercepted event for ex: `data.content.value` or `some.part.of.your.store`

Let's take this example
```js
const myStore = createStore({
  data: null,
  // My sensitive data
  deep: {
    content: {
      moreDeep: {}
    }
  },
  update: (storeRef: any) => {
   // ✅ Zero risk action
    storeRef.deep.content.moreDeep = {
      ...store.deep
    };
    // ❌ Risky action
    storeRef.deep = null;
    // ✅ Zero risk action
    storeRef.data = "some data";
    // ✅ Zero risk action
    storeRef.deep.content.moreDeep.content.moreDeep = "my deep content"
    // ❌ Risky action
    delete storeRef.deep
  },
});
```
With that all components that are connected to the sensitive data `deep.content.moreDeep` will simply stop working because `deep` will be null and also deleted later<br>.
Since it is sensitive data, we can always assure that `deep.content.moreDeep` will be available.<br>
Let's add an interceptor there

```js
myStore.intercept("deep.content.moreDeep", ({interception,allowAction,rejectAction}) => {
  if (!interception.preservePath) rejectAction();
})
```
`interception.preservePath` tell you if `deep.content.moreDeep` will be available after the update.
> [!NOTE]  
> When you reject an action, it will not interrupt other actions, because we suppose that not all of them are unsafe.<br>

In the example above all `❌ Risky action` are rejected, but all other actions happened without any issue.

> [!IMPORTANT]  
> Interceptor does not guarantee the type of value that will be set. You need to guaranty that yourself.<br>
> It will assure that the sensitive data will always be available. But the content of the sensitive data is up to you

Examples of more strict control. Even if interceptors are not designed for that

```js
myStore.intercept("some.part.your.store", ({interception,allowAction,rejectAction}) => {
  
  const {preservePath, update, action,key,value} = interception;

  // The Map must not be empty
  if (action === "clearInMap") rejectAction()
  
  // The path must always be available
  if (!preservePath)  rejectAction();
  
  // Must always be an object
  if (typeof update[key] !== "object")  rejectAction();
  
  // Must always be an object with one key
  if (Object.keys(update[key]).length > 1)  rejectAction();

  // Must always be an object with one key => test
  if (key !== "test")  rejectAction();
  
  // and so on
  
})
```
>[!NOTE]<br>
> Doing nothing in the interceptor allows the action

```js
// ❗ This will allow the action.
myStore.intercept("data.map", (store) => {
  // You do nothing
})

```

### Promise, Async & await in interceptors
Just act when you are ready. If you are not using await, do not omit the return keyword because we are also trying to resolve your callback.
```js
myStore.intercept("data.map", async (store) => {
  const ok = await serverCheck(store.interception.value);
  !ok && store.rejectAction()
})

myStore.intercept("data.map", async (store) => {
  // ✅ add return
  return serverCheck(store.interception.value).then(ok => {
    !ok && store.rejectAction()
  });
})

myStore.intercept("data.map", async (store) => {
  // ❌ you omit return
  serverCheck(store.interception.value).then(ok => {
    // ❌ to late
    !ok && store.rejectAction()
  });
})

myStore.intercept("data.map", (store) => {
  // ✅ add return
  return new Promise(resolve => {
    // doing some stuff
    /// Resolve your decision
    resolve(store.rejectAction)
    
    // Or 
    store.rejectAction()
    resolve()
  })
})

```

### Override an action by key

```js
myStore.intercept("data.value", (store) => {
  if (store.interception.value === someMaxValue) {
    // We redirect changes to another key
    store.override.key("otherKey")
  }

})
```

### Override an action by value

```js
myStore.intercept("data.value", (store) => {
  if (store.interception.value === someMaxValue) {
    // We keep the key and change the value
    store.override.value("newValue")
  }

})
```

### Override an action by key and value

```js
myStore.intercept("data.value", (store) => {
  if (store.interception.value === someMaxValue) {
    // We redirect changes to another key with newValue
    store.override.keyAndValue("otherKey", "newValue")
  }
})
```
That's it.
### Interceptor restrictions
You can only place one interceptor per line in your value.<br>
This is an example of a line in your store:

`data.content.value` is a line
`data.something.value` is a line

#### Duplicate interceptors
```js
// First interceptor
myStore.intercept("data.value", (store) => {

})
// Second interceptor override the first one
myStore.intercept("data.value", (store) => {

})
```
The second override the first one.

> [!NOTE]<br>
> If you intercept `data.content.value`, then you also intercept change on `data` and `data.content`<br>

For example: `data` was `{content: {value: 10}}`, and for some reason `data` becomes a `5`.<br>
We will immediately call your interceptor.<br>

The job of that interceptor is to keep the value inside `data.content.value` safe.<br>
But if `data` changes, you need to know if that change will impact your value or not.

You will never intercept change on `data.someThing` or `data.content.something`.
`data.content.something` changes will never impact `data.content.value`.

#### Multiple interceptors

You can add many interceptors as you want with once condition. Only one interceptor per value.

```js
// ✅ this one is kept
myStore.intercept("*", (store) => {})
// ❗ is override
myStore.intercept("data", (store) => {})
// ❗ is override
myStore.intercept("data.content", (store) => {})
// ✅ this one is kept
myStore.intercept("data.content.value", (store) => {})
```
`data.content.value` interceptor will handle all change including `data`, and `data.content`.

```js
// ❗ is override
myStore.intercept("data", (store) => {})
// ❗ is override
myStore.intercept("data", (store) => {})
// ✅ this one is kept
myStore.intercept("data", (store) => {}) 
```

```js
// ❗ is override
myStore.intercept("*", (store) => {})
// ✅ this one is kept
myStore.intercept("_D", (store) => {})
```
```js
// ❗ is override
myStore.intercept("_D", (store) => {})
// ✅ this one is kept
myStore.intercept("*", (store) => {})
```
`*` and `_D` is the same thing. They both intercept all data changes

#### How we call interceptors

Whether you reverse the order, for example

```js
myStore.intercept("data.content", (store) => {})
// Or
myStore.intercept("data", (store) => {})
// Or
myStore.intercept("data.content.value", (store) => {})
```

`data` interceptor will be called first, then
`data.content` then `data.content.value`.

We always call the interceptors in descending order, from the first to the last key.

#### From one Interceptor to another

If the first called interceptor overrides some value, then the next interceptor will intercept that new value.
Same thing for a key.<br>
If the first interceptor rejects the action, all other interceptors if they exist will be also called to do their check.
Let's take this example.
Our store value is `{data: {content: {value: 10 }}}`

```js
myStore.intercept("data.content", (store) => {
    // We intercept a change where
  if (store.interception.value === null) {
    store.rejectAction() 
  } else store.allowAction()
})
myStore.intercept("data.content.value", (store) => {
  // We intercept a change where
  if (store.interception.value > 10) {
    store.allowAction()
  } else store.rejectAction()
})
```
If we allow this action, it will brake all other components that are connected to `data.content.value`, `value` will not exist anymore.
Unless if it is what we want, we reject the action.<br>
In the meantime, the second interceptor will never be called, because the line is brake and his hierarchic interceptor rejects the action
for his safety.

#### Interceptors issue ?
My interceptor doesn't intercept anything.
> [!IMPORTANT]<br>
>If you fired an action before registering an interceptor, nothing will be intercepted

```js
// We fired the action ❌
mystore.dispatcher.updateSomeValue();
// We register the interceptor ❌
mystore.intercept("value",(s)=> ...);
```
This will not work. Be sure to register all your interceptors before firing your actions
```js
// We register first ✅
mystore.intercept("value",(s)=> ...);

// And later we fired some action ✅
mystore.dispatcher.updateSomeValue();
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
* `getDataSnapshot` A Function attached to your store that lets you get a snapshot that only contain the data of your store at any time.
* `getActions` A Function attached to your store that lets you get all actions in your store at any time.
* `on` A Function attached to your store that lets listen to all `change` in your store.
* `listen` A Function attached to your store that lets you listen to changes in a specific part of your store.
* `intercept` A Function attached to your store that lets you intercept changes in your store.
* `._D` A key that can be passed to your store in order to get all data in that store making it a PURE DATA
  CONSUMER.
* `groupKey._D` A key that can be passed to your grouped store in order to get all data in that store making it a PURE
  DATA CONSUMER. `groupKey` is the name of your group
* `*` A key that can be passed to your store in order to get everything in that store. It is similar to passing
  nothing. You can also use it to intercept, or listen to all changes in your store. 

<!-- LICENSE -->

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License. See `LICENSE.txt` for more information.
