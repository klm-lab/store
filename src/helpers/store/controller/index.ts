import { ALL } from "../../../constants/internal";
import type {
  FunctionType,
  InterceptOptionsType,
  InterceptorsType,
  InterceptorType
} from "../../../types";
import { callIfYouCan, pathIsPreserved } from "../../commonProdDev";

class StoreController {
  readonly #events: any;
  readonly #allListeners: Set<any>;
  #interceptorForAll: InterceptorType | null;
  #totalInterceptors: number;
  readonly #interceptors: InterceptorsType;
  #olderInterceptorEvent: string;
  readonly #updateStore: FunctionType;
  readonly #getDraft: FunctionType;

  constructor(updateStore: FunctionType, getDraft: FunctionType) {
    this.#events = {};
    this.#allListeners = new Set();
    this.#interceptorForAll = null;
    this.#totalInterceptors = 0;
    this.#interceptors = {};
    this.#olderInterceptorEvent = "";
    this.#updateStore = updateStore;
    this.#getDraft = getDraft;
  }

  subscribe(event: string, listener: any) {
    return this.#handleSubscribe(event, listener);
  }

  /* We add a subscription
   * First if the event is ALL, we add the listener to allListener collection.
   * We choose to separate all listeners from specific listeners
   * */
  #handleSubscribe(event: string, listener: any) {
    const registeredEvent = event.split(".")[0];
    /*
     * We add listener to the Set collection
     * */
    if (event === ALL) {
      this.#allListeners.add(listener);
      /* We return unsubscribe function where we delete
       * the listener from allListener collections
       * */
      return () => this.#allListeners.delete(listener);
    }
    /*
     * Events is not ALL.
     * We check if a collection already exists with the event.
     * If so, we add the listener to the collection.
     * If not, we first create the collection and then add the listener to it
     * */
    /*
     * All events that come here are always the root key of the data.
     * Example: data= {key1:, key2, key3,....}, create event key1, event key2, and event key3.
     * We don't care about nested keys because they are linked to their root key.
     * If data in rootKey changes, nested keys subscribers should be informed.
     * If data in nested keys changes, rootKey subscribers should also be informed
     * So we lock the event with the root Key and inform all of them when something changes.
     * The getData function takes care of caching response to avoid sending data when no changes occur on that data
     * */
    if (!(registeredEvent in this.#events)) {
      // Collection doesn't exist with this specific event. We create it
      this.#events[registeredEvent] = new Set();
    }
    // We add the listener to the specific event collection
    this.#events[registeredEvent].add(listener);
    return () => {
      // We delete the listener from the specific event collection
      this.#events[registeredEvent].delete(listener);
    };
  }

  /*
   * Registering an interceptor.
   * Interceptors are unique per key.
   * If an interceptor is registered for all data in the store, then it will be unique.
   * Same thing for specific data interceptor.
   * But to register them, we need all keys that are available in the store.
   * This is why for.
   * Suppose an interceptor 'INT_ONE' that intercept 'data.content.value'.
   * It will be called if 'data.content.value' or 'data.content'
   * or 'data' or anything inside 'data.content.value' changes.
   * We need to register the interceptor function on all these keys.
   * 'data' will have it, 'data.content' will have it, 'data.content.value' will have it
   * and if 'data.content.value' is an object, then anything inside 'data.content.value' will have it.
   *
   * But if another interceptor 'INT_TWO' wants to intercept 'data', for example,
   * Its function will replace any function inside 'data' listener.
   * But all functions inside 'data.content' and 'data.content.value'
   * will remain the same.
   * This is for avoiding calling two interceptors at the same time.
   * Every interceptor near the rootKey will have the priority on others.
   * Once they finish their work, if they allow the operations, nested interceptors will be called if they are present.
   * If they reject the action, then everything stops there
   *
   * */
  registerInterceptor(event: string, listener: any) {
    return this.#handleInterceptorRegistering(event, listener);
  }

  /*
   * We this util function to loop through event key
   * and register interceptor for all doted keys one by one.
   * When we say all doted keys, we talked about, 'data', 'data.content', 'data.content.value' and so on
   * We take, for example, the event 'data.someValue.other' and
   * we get 'data', 'data.someValue' and 'data.someValue.other'. 3 doted keys from the event.
   * When we create a doted key, we call the registering action to register the listener with that doted key.
   *
   * action(key) where key = key === firstElementInArray ? firstElementInArray : `${key}.${firstElementInArray}`;
   * */
  #splitInterceptorEventByKey(event: string, action: any) {
    const eventTab = event.split(".");
    let key = eventTab[0];
    eventTab.forEach((e) => {
      key = key === e ? e : `${key}.${e}`;
      action(key);
    });
  }

  /*
   * Now time to registering.
   * Again, if event is all that means, this interceptor will intercept all data.
   * But unlike subscription, allInterceptors are not a collection,
   * Remember interceptors are unique. So we override the value.
   * Only one interceptor per value intercepted.
   * We count all interceptors for later.
   * */
  #handleInterceptorRegistering(event: string, listener: any) {
    if (event === ALL) {
      //Only one interceptor
      this.#interceptorForAll = {
        listener,
        path: ALL
      };
      //Interceptors counter-increment
      this.#totalInterceptors += 1;
      return () => {
        // We delete the interceptor
        this.#interceptorForAll = null;
        //Interceptors counter-decrement
        this.#totalInterceptors -= 1;
      };
    }
    // We will use this util function to get all doted keys and proceed with registration
    this.#splitInterceptorEventByKey(event, (key: string) => {
      /* For every doted key. We check if an interceptor already exists.
       * If so, we check if the length of interceptor event is greater than the new event.
       * If it is greater, we override the old listener with the new one.
       * Let me explain why we do that
       *
       * Suppose the first interceptor INT_ONE comes with event => "data.content.value",
       * Its listener is added to 'data', 'data.content' and  'data.content.value' as we learn.
       * Fine. Now another interceptor INT_TWO comes with this event => 'data.content'.
       * We do the same thing as adding its listener to 'data' and 'data.content'.
       *
       * 'Data' has new listener, 'data.content' also, and 'data.content.value' keeps its old listener and it is fine.
       *
       * But why do we need to check the length ???.
       *
       * Just reverse the order that event are come in, and you will understand.
       * INT_ONE comes with "data.content" and INT_TWO comes with "data.content.value".
       *
       * So 'data' will finally have INT_TWO listener, same for 'data.content' and also 'data.content.value'.
       *
       * WHERE IS THE INT_ONE LISTENER ???.
       *
       * ITS gone, and we don't want that.
       *
       * By checking the length of the event, 'data.content' is lower than 'data.content.value',
       * So when we are on 'data' key, the length is lower, we do not touch listener
       * When on 'data.content' length is same, we do not touch listener
       * When on 'data.content.value', length is great, we override listener.
       *
       * I hope you understand the trick.
       *
       * Also, remember this.
       * Every doted key near the root key has priority on other keys
       * So, when the length is lower, the event is a priority. We need to override the oldInterceptor event with the new one.
       * For next check.
       *
       * If the length is the same and event is the same, then we keep the latest one
       *
       * And of course, if no listener is present, we just add the new one.
       * We increment the total of interceptors for later
       *
       * */
      if (this.#interceptors[key]) {
        // Greater length. We override interceptor
        if (this.#olderInterceptorEvent.length > event.length) {
          this.#interceptors[key] = {
            listener,
            path: event
          };
        }
        // Same length, same job, we can only keep one, and we will keep the latest one
        //if (this.#olderInterceptorEvent.length === event.length) {
        if (this.#olderInterceptorEvent === event) {
          this.#interceptors[key] = {
            listener,
            path: event
          };
        }
      } else {
        // New interceptor
        this.#interceptors[key] = {
          listener,
          path: event
        };
      }
    });
    //Interceptors counter-increment
    this.#totalInterceptors += 1;
    /* Every doted key near the root key has priority on other keys.
     * If the length of the new one is short, we override else,
     * we keep it until find a one that is short and then override
     * */
    if (this.#olderInterceptorEvent.length < event.length) {
      this.#olderInterceptorEvent = event;
    }

    // Unsubscription for Interceptors.
    return () => {
      /*
       * We loop through the doted key and check if the listener is the current listener.
       * If so, we delete it
       * */
      this.#splitInterceptorEventByKey(event, (key: string) => {
        if (this.#interceptors[key].listener === listener) {
          delete this.#interceptors[key];
        }
      });
      //Interceptors counter-decrement
      this.#totalInterceptors -= 1;
    };
  }

  #dispatch(event: string) {
    this.#updateStore();
    // we get the rootKey as event
    const registeredEvent = event.split(".")[0];
    //Call all 'ALL' listeners if they are present
    if (this.#allListeners.size > 0) {
      this.#allListeners.forEach((listener: any) => listener());
    }

    // Dispatching an event that maybe is valid and exist but with no subscribers
    if (!(registeredEvent in this.#events)) {
      return;
    }
    // Call listeners relative to the event if someone subscribes
    this.#events[registeredEvent].forEach((listener: any) => listener());
  }

  handleDispatch(event: string, options: InterceptOptionsType) {
    this.#handleInterceptors(event, options);
  }

  /*
   * This util calls the interceptor and gives him intercepted data plus
   * and some actions which call other interceptors if they are present.
   * If not, the decision of the first interceptor is executed
   * */
  #callInterceptor(
    event: string,
    interceptor: InterceptorType,
    options: InterceptOptionsType,
    nextInterceptor: (options: InterceptOptionsType) => void
  ) {
    const { listener, path } = interceptor;
    listener({
      interception: {
        value: options.value,
        update: options.state,
        key: options.key,
        action: options.action,
        event,
        preservePath: pathIsPreserved(path, this.#getDraft)
      },
      // Call another interceptor with an allowed decision
      allowAction: () => {
        options.interceptorAction = "allowAction";
        nextInterceptor(options);
      },
      override: {
        // Call another interceptor with new override value or old value
        value: (value?: any) => {
          options.value = value ?? options.value;
          options.interceptorAction = "override.value";
          nextInterceptor(options);
        },
        // Call another interceptor with new override key or old key
        key: (key?: any) => {
          options.key = key ?? options.key;
          options.interceptorAction = "override.key";
          nextInterceptor(options);
        },
        // Call another interceptor with a new override key and value or old key and value
        keyAndValue: (key?: any, value?: any) => {
          options.key = key ?? options.key;
          options.value = value ?? options.value;
          options.interceptorAction = "override.keyAndValue";
          nextInterceptor(options);
        }
      },
      // rejectAction: () => void 0
      rejectAction: () => {
        options.interceptorAction = "rejectAction";
        nextInterceptor(options);
      }
    });
  }

  /*
   * This util will create a Set of doted key from the event.
   * So we will iterate through its value step by step
   * */
  // #createSetEventsByKey(event: string) {
  //   const eventTab = event.split(".");
  //   const set = new Set();
  //   let key = eventTab[0];
  //   eventTab.forEach((e) => {
  //     key = key === e ? e : `${key}.${e}`;
  //     set.add(key);
  //   });
  //   return set;
  // }

  /*
   * Instead of using the util describe above. We will create our own generator function,
   * to yield step by step its value and save some line of code
   * */
  *#createSetEventsByKey(event: string): Generator<string> {
    const eventTab = event.split(".");
    //We grab the first key
    let key = eventTab[0];
    /* We loop through the event Tab and concat the key with next key in event Tab
     * Generator will be done when we call next() at the end of the loop.
     * At the end, value will be undefined and done will be set to true.
     * */
    for (let i = 0; i < eventTab.length; i++, key = `${key}.${eventTab[i]}`) {
      yield key;
    }
  }

  /*
   * This is the final action performed after interceptor decisions
   * */
  #dispatchControlledAction(event: string, options: InterceptOptionsType) {
    callIfYouCan(options, () => {
      options.next(options);
      if (options.interceptorAction !== "rejectAction") {
        this.#dispatch(event);
      }
    });
  }

  /*
   * Place to handle interceptors
   * */
  #handleInterceptors(event: string, options: InterceptOptionsType) {
    /*
     * This why we counted interceptors.
     * If they are not present. We just allow the action and dispatch the event
     * */
    if (this.#totalInterceptors <= 0) {
      options.next(options);
      this.#dispatch(event);
      return;
    }
    /*
     * Interceptors are present, At least one.
     * We will need another set to track calledInterceptors Function.
     * As we know, interceptors are registered on every key in the store.
     * So while looping, if we call a function, no need to call it again later.
     * */

    // We create the iterator
    // const eventIterator = this.#createSetEventsByKey(event).values();
    const eventIterator = this.#createSetEventsByKey(event);
    // We create calledInterceptors collection
    const calledInterceptors = new Set();

    // We define nextInterceptor actions. It takes action and options that can be changed by interceptors
    const nextInterceptor = (finalOptions?: any) => {
      // We get the current value from iterator and also the done variable
      const { value: key, done } = eventIterator.next();
      /* First, we check if an interceptor is registered with the current key.
       * If so, we check if we didn't call the interceptor.
       * If so, we add the interceptor to the called collection and we call it.
       * When we call the interceptor, and we also give him the next interceptor to call
       * */
      if (
        key in this.#interceptors &&
        !calledInterceptors.has(this.#interceptors[key].listener)
      ) {
        // Add interceptor to called collection
        calledInterceptors.add(this.#interceptors[key].listener);
        // Calling the interceptor
        this.#callInterceptor(
          event,
          this.#interceptors[key],
          finalOptions,
          /* Giving the next nextInterceptor
           * When this interceptor takes its decision, it will call nextInterceptor
           * to get next Value and nextKey and do the same check, and so on until done
           * */
          nextInterceptor
        );
        return;
      }
      /*
       * The iterator finish and the finalOptions contain
       * a merged decision from all interceptors
       */
      if (done) {
        /* Time for judgment 😀.
         * We dispatch the final decision
         * */
        this.#dispatchControlledAction(event, finalOptions);
        return;
      }
      /*
       * When no interceptor is found on a current doted key or, it is found but the function is already called
       * We move to the next key until done
       * */
      nextInterceptor(finalOptions);
    };

    /*
     * Before start anything, we first check if there is an interceptor for all data in the store.
     * If so, we call it first and then ask him to call other interceptors if they exist.
     * If other interceptor share the same function, then they will not be called
     * */

    if (this.#interceptorForAll) {
      // Add interceptor to called collection
      calledInterceptors.add(this.#interceptorForAll.listener);
      this.#callInterceptor(
        event,
        this.#interceptorForAll,
        options,
        nextInterceptor
      );
      return;
    }
    // We start everything
    nextInterceptor({ ...options });
  }
}

export { StoreController };
