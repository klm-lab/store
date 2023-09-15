export const GROUP = "group";
export const SLICE = "slice";
export const SUBSCRIPTION = "subscription";
export const INTERCEPTION = "interception";
export const ALL = "*";

export const E_T = process.env.NODE_ENV !== "production" && "E_T";

export const ERROR_TEXT =
  process.env.NODE_ENV !== "production" &&
  Object.freeze({
    STORE_EMPTY: `The store is empty`,
    STORE_NOT_OBJECT: `The store is not an object`,
    GROUP_STORE_NOT_OBJECT: `We found a group store key => ${E_T} which is not an object. If you plan to create a slice store. Add a function at the first level of your store`,
    STORE_PROPERTY_UNDEFINED: `${E_T} is undefined in the store.`,
    NOT_CHANGE_EVENT: `This listener is for change event. Pass event => 'change' to be able to listen.`,
    OPTIONAL_INVALID_TARGET: `Target is optional. But it need to be valid if passed. Actual value is empty, fix it or remove it`,
    NO_PARAMS: `No params are allowed here. Please remove it`,
    NOT_VALID_LISTEN_EVENT: `Provide a valid event to be able to listen.`,
    NOT_VALID_INTERCEPT_EVENT: `Provide a valid event to be able to intercept.`,
    NOT_VALID_CALLBACK: `Provide a valid callback, a function to be able to listen.`,
    NO_NODE_ENV: `@klm-lab/store \n NODE_ENV value is neither production, nor development. Make sure to expose it with production value to be able to get the smallest and fastest version of @klm-lab/store on production build`,
    CAN_NOT_BE_CALLED: `Current action not allow you to call ${E_T}`
  });
