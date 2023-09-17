import { ALL } from "../../../constants/internal";
import type {
  FunctionType,
  InterceptOptionsType,
  InterceptorsType,
  InterceptorType,
  SubscribeType
} from "../../../types";
import { isAllowedToCall, pathIsPreserved } from "../../commonProdDev";

class StoreController {
  readonly #events: SubscribeType;
  readonly #allListeners: Set<any>;
  readonly #interceptors: InterceptorsType;
  readonly #updateStore: FunctionType;
  readonly #getDraft: FunctionType;

  constructor(updateStore: FunctionType, getDraft: FunctionType) {
    this.#events = {};
    this.#allListeners = new Set();
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

  registerInterceptor(event: string, listener: any) {
    return this.#handleInterceptorRegistering(event, listener);
  }

  #handleInterceptorRegistering(event: string, listener: any) {
    const registeredEvent = event.split(".")[0];

    this.#interceptors[registeredEvent] = {
      path: event,
      listener
    };
    return () => delete this.#interceptors[registeredEvent];
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

  #dispatchControlledAction(options: InterceptOptionsType) {
    isAllowedToCall(options, () => {
      options.next(options);
      if (options.interceptorAction !== "rejectAction") {
        this.#dispatch(options.event);
      }
    });
  }

  #handleInterceptors(options: InterceptOptionsType) {
    const { event } = options;
    if (event in this.#interceptors) {
      this.#callInterceptor(this.#interceptors[event], options);
      return;
    }
    options.next(options);
    this.#dispatch(event);
  }

  #callInterceptor(
    interceptor: InterceptorType,
    options: InterceptOptionsType
  ) {
    const { listener, path } = interceptor;
    const { preservePath, update } = pathIsPreserved(path, this.#getDraft);
    listener({
      interception: {
        value: options.value,
        update,
        key: options.key,
        action: options.action,
        event: options.event,
        preservePath
      },
      allowAction: () => {
        options.interceptorAction = "allowAction";
        this.#dispatchControlledAction(options);
      },
      override: {
        value: (value?: any) => {
          options.value = value ?? options.value;
          options.interceptorAction = "override.value";
          this.#dispatchControlledAction(options);
        },
        key: (key?: any) => {
          options.key = key ?? options.key;
          options.interceptorAction = "override.key";
          this.#dispatchControlledAction(options);
        },
        keyAndValue: (key?: any, value?: any) => {
          options.key = key ?? options.key;
          options.value = value ?? options.value;
          options.interceptorAction = "override.keyAndValue";
          this.#dispatchControlledAction(options);
        }
      },
      rejectAction: () => {
        options.interceptorAction = "rejectAction";
        this.#dispatchControlledAction(options);
      }
    });
  }
}

export { StoreController };
