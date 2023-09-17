import { ALL } from "../../../constants/internal";
import type { FunctionType, SubscribeType } from "../../../types";

class StoreController {
  readonly #events: SubscribeType;
  readonly #allListeners: Set<any>;
  readonly #updateStore: FunctionType;

  constructor(updateStore: FunctionType) {
    this.#events = {};
    this.#allListeners = new Set();
    this.#updateStore = updateStore;
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

  dispatch(event: string) {
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
}

export { StoreController };
