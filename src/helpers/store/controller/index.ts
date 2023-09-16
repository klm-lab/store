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
  readonly #updateStore: FunctionType;
  readonly #getDraft: FunctionType;

  constructor(updateStore: FunctionType, getDraft: FunctionType) {
    this.#events = {};
    this.#allListeners = new Set();
    this.#interceptorForAll = null;
    this.#totalInterceptors = 0;
    this.#interceptors = {};
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
   * 'Data' will have it, 'data.content' will have it, 'data.content.value' will have it
   * and if 'data.content.value' is an object, then anything inside 'data.content.value' will have it.
   *
   * But if another interceptor 'INT_TWO' wants to intercept 'data', for example,
   * Its function will be ignored.
   * This is for avoiding calling two interceptors at the same time.
   * Every interceptor far from the rootKey will have the priority on others.
   * Once they finish their work, if they allow the operations, other interceptors will be called if they are present.
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
       * If so, we check if the length of interceptor event is less than the new event.
       * If it is less, we override the old listener with the new one.
       * Let me explain why we do that
       *
       * Suppose the first interceptor INT_ONE comes with event => "data.content.value",
       * Its listener is added to 'data', 'data.content' and  'data.content.value' as we learn.
       * Fine. Now another interceptor INT_TWO comes with this event => 'data.content'.
       * We do the same thing as adding its listener to 'data' and 'data.content'.
       *
       * 'Data' has new listener, 'data.content' also, and 'data.content.value' keeps its old listener, and that is the problem.
       * Because INT_TWO can only care about him and allow some action that affect 'data.content.value'.
       *
       * Also, remember this.
       * Every doted key far from the root key has priority on other keys
       * So, when the length is greater, the old event has a lower priority. We need to override the oldInterceptor event with the new one.
       * For next check.
       *
       * If the old event length and new event length are the same, then we keep the latest one
       *
       * And of course, if no listener is present, we just add the new one.
       * We increment the total of interceptors for later
       *
       * */
      if (this.#interceptors[key]) {
        // Higher priority event found. We override interceptor
        if (this.#interceptors[key].path.length < event.length) {
          this.#interceptors[key] = {
            listener,
            path: event
          };
        }
        // Same length, same job, we can only keep one, and we will keep the latest one
        if (this.#interceptors[key].path === event) {
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

  handleDispatch(options: InterceptOptionsType) {
    this.#handleInterceptors(options);
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
    nextAction: (options: InterceptOptionsType) => void
  ) {
    const { listener, path } = interceptor;
    const { preservePath, update } = pathIsPreserved(path, this.#getDraft);
    listener({
      interception: {
        value: options.value,
        update,
        key: options.key,
        action: options.action,
        event,
        preservePath
      },
      allowAction: () => {
        options.interceptorAction = "allowAction";
        nextAction(options);
      },
      override: {
        value: (value?: any) => {
          options.value = value ?? options.value;
          options.interceptorAction = "override.value";
          nextAction(options);
        },
        key: (key?: any) => {
          options.key = key ?? options.key;
          options.interceptorAction = "override.key";
          nextAction(options);
        },
        keyAndValue: (key?: any, value?: any) => {
          options.key = key ?? options.key;
          options.value = value ?? options.value;
          options.interceptorAction = "override.keyAndValue";
          nextAction(options);
        }
      },
      rejectAction: () => {
        options.interceptorAction = "rejectAction";
        nextAction(options);
      }
    });
  }

  /*
   * This is the final action performed after interceptor decisions
   * */
  #dispatchControlledAction(options: InterceptOptionsType) {
    callIfYouCan(options, () => {
      options.next(options);
      if (options.interceptorAction !== "rejectAction") {
        this.#dispatch(options.event);
      }
    });
  }

  /*
   * Place to handle interceptors
   * */
  #handleInterceptors(options: InterceptOptionsType) {
    /*
     * This why we counted interceptors.
     * If they are not present. We just allow the action and dispatch the event
     * */
    if (this.#totalInterceptors <= 0) {
      options.next(options);
      this.#dispatch(options.event);
      return;
    }
    /*
     * Interceptors are present, At least one.
     * As we know, interceptors are registered on every key in the store.
     * */

    /* We define nextInterceptor.
     * It takes options that can be changed by * interceptors if he exists
     * We check if interceptor for All data listener is not the same as the specific one.
     * If so, no need to call it again.
     * We just continue with the action and dispatch.
     * Else, we call the specific interceptor
     * */
    const nextInterceptor = (finalOptions: InterceptOptionsType) => {
      const { event } = finalOptions;
      if (
        event in this.#interceptors &&
        !(
          this.#interceptorForAll?.listener ===
          this.#interceptors[event].listener
        )
      ) {
        this.#callInterceptor(
          event,
          this.#interceptors[event],
          finalOptions,
          /*
           * When he's done, he will dispatch final decision
           * */
          this.#dispatchControlledAction
        );
      } else {
        options.next(options);
        this.#dispatch(event);
      }
    };

    /*
     * Before start anything, we first check if there is an interceptor for all data in the store.
     * If so, we call it first and then ask him to call other interceptors if they exist.
     * If another interceptor shares the same function, then they will not be called
     * */
    if (this.#interceptorForAll) {
      this.#callInterceptor(
        options.event,
        this.#interceptorForAll,
        options,
        nextInterceptor
      );
      return;
    }
    nextInterceptor({ ...options });
  }
}

export { StoreController };
