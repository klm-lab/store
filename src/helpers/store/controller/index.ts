import { ALL } from "../../../constants/internal";
import { InterceptOptionsType } from "../../../types";
import { _checkInterceptorCall } from "../../developement";

class StoreController {
  readonly #events: any;
  readonly #allListener: Set<any>;
  readonly #allInterceptors: Set<any>;
  readonly #interceptors: any;

  constructor() {
    this.#events = {};
    this.#allListener = new Set();
    this.#allInterceptors = new Set();
    this.#interceptors = {};
  }

  createStoreEvent(store: any, key: string) {
    this.#generateEvent(store, key);
  }

  #generateEvent(store: any, key: string) {
    if (store && store.constructor.name === "Object") {
      Object.keys(store).forEach((k) => {
        const event = key !== "" ? `${key}.${k}` : (`${k}` as string);
        this.#events[event] = new Set();
        this.#interceptors[event] = new Set();
        this.#generateEvent(store[k], event);
      });
    }
  }

  subscribe(event: string, listener: any) {
    return this.#handleSubscribe(event, listener);
  }

  registerInterceptor(event: string, listener: any) {
    return this.#handleInterceptorRegistering(event, listener);
  }

  #eventByKey(event: string, action: any) {
    const eventTab = event.split(".");
    eventTab.reverse().forEach((e) => {
      action(event);
      event = event.replace("." + e, "");
    });
  }

  #handleInterceptorRegistering(event: string, listener: any) {
    if (event === ALL) {
      this.#allInterceptors.add(listener);
      return () => this.#allInterceptors.delete(listener);
    }
    this.#eventByKey(event, (key: string) => {
      // console.log(event);
      // if (!(key in this.#interceptors)) {
      //   this.#interceptors[key] = new Set();
      // }
      this.#interceptors[key].add(listener);
    });
    // console.log(this.#interceptors);
    return () => {
      this.#eventByKey(event, (key: string) => {
        this.#interceptors[key].delete(listener);
      });
    };
  }

  #handleSubscribe(event: string, listener: any) {
    if (event === ALL) {
      this.#allListener.add(listener);
      return () => this.#allListener.delete(listener);
    }
    this.#eventByKey(event, (key: string) => {
      this.#events[key].add(listener);
    });
    console.log(this.#events);
    return () => {
      this.#eventByKey(event, (key: string) => {
        this.#events[key].delete(listener);
      });
    };
  }

  #dispatch(event: string) {
    if (this.#allListener.size > 0) {
      this.#allListener.forEach((listener: any) => listener());
    }
    if (event in this.#events) {
      const calledListener = new Set();
      this.#eventByKey(event, (key: string) => {
        this.#events[key].forEach((listener: any) => {
          if (!calledListener.has(listener)) {
            calledListener.add(listener);
            listener();
          }
        });
      });
      calledListener.clear();
    }
  }

  handleDispatch(event: string, options: InterceptOptionsType) {
    this.#handleInterceptors(event, options);
  }

  #callInterceptor(
    event: string,
    listener: any,
    options: InterceptOptionsType
  ) {
    listener({
      intercepted: {
        value: options.value,
        state: options.state,
        key: options.key,
        action: options.action,
        event
      },
      allowAction: () => {
        options.allowAction(options.value);
        this.#dispatch(event);
      },
      override: {
        value: (value?: any) => {
          _checkInterceptorCall(options, "override.value");
          options.allowAction(value ?? options.value);
          this.#dispatch(event);
        },
        key: (key?: any) => {
          _checkInterceptorCall(options, "override.key", true);
          options.overrideKey(key ?? options.key);
          this.#dispatch(event);
        },
        keyAndValue: (key?: any, value?: any) => {
          _checkInterceptorCall(options, "override.keyAndValue", true);
          options.overrideKeyAndValue(
            key ?? options.key,
            value ?? options.value
          );
          this.#dispatch(event);
        }
      },
      rejectAction: () => void 0
    });
  }

  #handleInterceptors(event: string, options: InterceptOptionsType) {
    // const next = () => {
    //   if (!(event in this.#interceptors)) {
    //     options.allowAction(options.value);
    //     return this.#dispatch(event);
    //   }
    //   this.#interceptors[event].forEach((listener: any) => {
    //     this.#callInterceptor(event, listener, options);
    //   });
    // };
    // if (this.#allInterceptors.size > 0) {
    //   this.#allInterceptors.forEach((listener: any) => listener());
    // }

    const calledInterceptors = new Set();
    this.#eventByKey(event, (key: string) => {
      if (this.#interceptors[key].size > 0) {
        this.#interceptors[key].forEach((listener: any) => {
          if (!calledInterceptors.has(listener)) {
            calledInterceptors.add(listener);
            this.#callInterceptor(event, listener, options);
          }
        });
      }
    });
    if (calledInterceptors.size > 0) {
      calledInterceptors.clear();
      return;
    }

    options.allowAction(options.value);
    this.#dispatch(event);
  }
}

export { StoreController };
