import { StoreController } from "../helpers/store";
/*We exclude other types from suggestions
 * if the key extends one of these below, we return key else
 * We check if next nested key (S[key] extends object), then we join
 * previous key with whatever key from NestedKey of S[Key] and so on
 * until S[Key] not extends object. In that case, we return the key.
 *
 * We infer U to extend string to be sure that we call recursive NestedKey only with a string key
 * */
type NestedKeyTypes<S> = {
  [Key in keyof S & string]: S[Key] extends
    | Map<any, any>
    | Date
    | Set<any>
    | Array<any>
    ? Key
    : S[Key] extends object
    ?
        | `${Key}`
        | `${Key}.${NestedKeyTypes<S[Key]> extends infer U extends string
            ? U
            : never}`
    : `${Key}`;
}[keyof S & string];

/* Suggestion for group store
 * storeKey.${custom(_A | _D)}
 * */
type DataOrActionsKeyTypes<S> = {
  [Key in keyof S & string]: `${Key}._A` | `${Key}._D`;
}[keyof S & string];

/* Suggestion for slice and group store based on storeOptions O
 * If o contains storeType: "group", then the user wants a grouped store.
 * So the target key can be any nested key and also storeKey.${custom(_A | _D)}
 * in case of a slice store, we have nestedKey and _A | _ D
 * _A is to type the result as chainable actions and _D as all data
 * */
type TargetType<S> = GetStoreType<S> extends "group"
  ? NestedKeyTypes<S> | DataOrActionsKeyTypes<S> | "*"
  : NestedKeyTypes<S> | "_A" | "_D" | "*";

/* Return list a key that is not function.
 * We cast the result as [keyof S] to
 * be able to use it like this { [newK in castedResult]: ... }.
 * All keys present in castedResult are not functions
 * */
type NotFunctions<S> = {
  [Key in keyof S]: S[Key] extends Function ? never : Key;
}[keyof S];

/* Here we are using the castedResult as a mapped key.
 * In order to get key in any key that is not a function
 * */
type DataOnlyType<S> = {
  [key in NotFunctions<S>]: S[key];
};

/* Return list a key that is function.
 * We cast the result as [keyof S] to
 * be able to use it like this { [newK in castedResult]: ... }.
 * All keys present in castedResult are functions
 * */
type OnlyFunctions<S> = {
  [Key in keyof S]: S[Key] extends Function ? Key : never;
}[keyof S];

/* Here we are using the castedResult as a mapped key.
 * In order to get key in any key, that is a function.
 * Since it is a function
 * We chain it by returning itself
 * */
type FunctionChainType<S> = {
  [key in OnlyFunctions<S>]: (...values: unknown[]) => FunctionChainType<S>;
};

// We check if type T extends type U if so we return T else never
type CheckExtends<T, U> = T extends U ? T : never;
/* We check if key of S extends Functions, if so CheckExtends return the key,
 * We check if key is never, (meaning k not extend Function) then we return group
 * else we return slice
 * */
type GetStoreType<S> = CheckExtends<S[keyof S], Function> extends never
  ? "group"
  : "slice";

/* Here we are doing the same thing as FunctionChainType with an exception.
 * The scenario here is a grouped store. And in a grouped store,
 * we first have the groupKey or storeKey then have storeContent.
 * We make the storeKey a function that returns all other functions
 * in the groupedStore[groupKey]. It is like we are fist calling
 * groupedStore[groupKey]('called').someFunction().otherFunction()....
 * If we skip this part, the groupedStore[groupKey] is not typed callable
 * but typed a value that contains otherFunctions.
 * groupedStore[groupKey]'not called'.someFunction().otherFunction()
 * */
type FunctionKeyType<S> = (...values: unknown[]) => FunctionChainType<S>;

/* This is the storeOutputType, it's check if the option passed is a group
 * then called StoreGroupOutputType else call SliceStoreOutputType with
 * a rewrite type of the state. FunctionChainType rewrites all functions types
 * and DataOnlyType keeps definitions as they are. We rewrite functions types
 * so the user can easily in js or ts project know that his function is chainable
 * */
type StoreOutputType<S, K> = GetStoreType<S> extends "group"
  ? StoreGroupOutputType<S, K>
  : // We rewrite the type of functions to match our definitions and merge others keys as they are
    SliceStoreOutputType<S, K>;

/* This is the StoreGroupOutputType,
 *For every k in S, it's check if any keyof state at the current key(k) position
 * keyof S[k] extends a function type, if so, we return the callable function rewrote
 * which return chain actions.
 * If not, we check if S[k] extends an object, if so, we check if S[K][nestedKey]
 * is a Function, if so, we rewrite that function else, we return S[K][nestedKey].
 * And id S[K] is not an object, we return
 * it because k is part of S.
 *
 * If k is not part of S, then we have k.otherKey.
 * We infer some type to k.
 * It is like we split
 * k.otherKey to [k,otherKey], so we can work with both separately.
 * k extends `${infer firstKey}.${infer otherKey}`.
 * know we check if k extends new inferTypes which is true since we respect eh k string syntax
 * and then check if firstKey is par of S. if so we call StoreGroupOutputType again which S[firstKey]
 * We recursively check every inferred key until firstKey is not a part of S then we return never
 * because we do not know what it is.
 *
 * Fo example, we have some target = "test.data.value".
 * and data = {test: {data: {value: 10}}}.
 *  We check if test.data.value is part of S, and it is not.
 * Valid keys are test, data, and value.
 * Not test.data.value.
 * Since it is not, we infer firstKey like this
 * `firstKey = "test" and otherKey: "data.value"` and then check again with S[firstKey = "test"] as new State
 * and data.value as newKey which lead us to infer `firstKey = "data"`.
 * secondKey = "value" because
 * data is part of test and value is part of test but data.value is not part of S["test"].
 * We check again with S["data"] as new State and value as newKey.
 * This time value is part S["data"].
 * We check if (keyof S["data"] which is value) has a type of Function.
 * ex: value = ()=> void or whatever.
 * if so, we make value callable, and we make it return itself, so user can do value().value().something else
 * if existed.
 * Now if it is not a function, we just return the type as it is.
 * a number here (10).
 *
 * Now if K (the target passed is not like string.string, where string is part of S), that means something like
 * string.45645, or string.___ or string.anything.
 * Extending or matching K witch our inferred type
 * will fail when checking if 45645 or ___ is part of S and then called CustomSuggestionType to do come check
 * */
type StoreGroupOutputType<S, K> = K extends keyof S
  ? keyof S[K] extends Function
    ? FunctionKeyType<S>
    : /* Second check to see if it is an object.
     *Here the user sends, for example, modal as a key
     * which is some root key of the group.
     *group.modal.....
     **/
    S[K] extends object
    ? /* We check if his S[K][NK] extends Function, if so we rewrite functions
       * else, we return S[K][NK]
       * **/
      {
        [NK in keyof S[K]]: keyof S[K][NK] extends Function
          ? FunctionKeyType<S[K]>
          : S[K][NK];
      }
    : // Nested is not an object // S[K],
      S[K]
  : //FunctionKeyType<S[K]> & DataOnlyType<S[K]>
  K extends `${infer FirstKey}.${infer SecondKey}`
  ? FirstKey extends keyof S
    ? StoreGroupOutputType<S[FirstKey], SecondKey>
    : never
  : CustomSuggestionType<S, K>;

type SliceStoreOutputType<S, K> = K extends keyof S
  ? keyof S[K] extends Function
    ? FunctionKeyType<S>
    : S[K]
  : K extends `${infer FirstKey}.${infer SecondKey}`
  ? FirstKey extends keyof S
    ? SliceStoreOutputType<S[FirstKey], SecondKey>
    : never
  : CustomSuggestionType<S, K>;

/*
 * In CustomSuggestionType, we check if K extends one of our suggestions
 * (_A | _D) and return chain actions of pure data or both, otherwise we return never
 * */
type CustomSuggestionType<S, K> = K extends "_A"
  ? FunctionChainType<S>
  : K extends "_D"
  ? DataOnlyType<S>
  : K extends "*"
  ? DataOnlyType<S> & FunctionChainType<S>
  : never;

type StoreEvent = "change";
type InterceptActionType =
  | "update"
  | "delete"
  | "deleteInSet"
  | "deleteInMap"
  | "clearInSet"
  | "clearInMap"
  | "addInSet"
  | "setInMap";

interface OverrideType {
  value(value: any): void;

  key(key: any): void;

  keyAndValue(key: any, value: any): void;
}

interface InterceptDataType<S, TargetKey> {
  intercepted: {
    key: any;
    event: string;
    value: any;
    state: StoreOutputType<S, TargetKey>;
  };

  allowAction(): void;

  rejectAction(): void;

  override: OverrideType;
}

type ChangeHandlerType = {
  event: string;
  state: any;
  key: any;
  value: any;
  action: InterceptActionType;
};

type InterceptOptionsType = {
  value: any;
  state: any;
  key: any;
  action: InterceptActionType;
  allowAction: (value?: any) => void;
  overrideKey: (key?: any) => void;
  overrideKeyAndValue: (key?: any, value?: any) => void;
};

/*
 * StoreType.
 * Combine a dispatcher and the store as a function.
 * Can be used like, myStore() or myStore.dispatcher
 * The external dispatcher is returned, it will only contain actions.
 * So we chain those actions. Remember in a group, rootStore keys can never be function. So same principe
 * we extract rootKey and chain nested ones
 * */
type Store<S> = {
  intercept: <TargetKey>(
    event: TargetKey extends TargetType<S> ? TargetKey : TargetType<S>,
    callback: (data: InterceptDataType<S, TargetKey>) => void
  ) => () => void;
  getActions: () => GetStoreType<S> extends "slice"
    ? // Slice store,we rewrite Function and merge data
      FunctionChainType<S>
    : // Group store, we extract the first key then rewrite S[key] Function and merge S[key] data
      {
        [k in keyof S]: FunctionChainType<S[k]>;
      };
  getSnapshot: () => GetStoreType<S> extends "slice"
    ? // Slice store,we rewrite Function and merge data
      FunctionChainType<S> & DataOnlyType<S>
    : // Group store, we extract the first key then rewrite S[key] Function and merge S[key] data
      {
        [k in keyof S]: FunctionChainType<S[k]> & DataOnlyType<S[k]>;
      };
  getDataSnapshot: () => GetStoreType<S> extends "slice"
    ? // Slice store,we rewrite Function and merge data
      DataOnlyType<S>
    : // Group store, we extract the first key then rewrite S[key] Function and merge S[key] data
      {
        [k in keyof S]: DataOnlyType<S[k]>;
      };
  dispatcher: GetStoreType<S> extends "slice"
    ? FunctionChainType<S>
    : {
        [k in keyof S]: FunctionChainType<S[k]>;
      };
  on: (
    event: StoreEvent,
    callback: (store: FunctionChainType<S> & DataOnlyType<S>) => void
  ) => () => void;
  listenTo: <TargetKey>(
    event: TargetKey extends TargetType<S> ? TargetKey : TargetType<S>,
    callback: (data: StoreOutputType<S, TargetKey>) => void
  ) => () => void;
  <TargetKey>(
    target?: TargetKey extends TargetType<S> ? TargetKey : TargetType<S>
    // check if target is passed, NonNullable help us by excluding null and undefined
  ): TargetKey extends NonNullable<string>
    ? // Target is present
      StoreOutputType<S, TargetKey>
    : // Target is not present. We check if it is a slice Store
    GetStoreType<S> extends "slice"
    ? // Slice store,we rewrite Function and merge data
      FunctionChainType<S> & DataOnlyType<S>
    : // Group store, we extract the first key then rewrite S[key] Function and merge S[key] data
      {
        [k in keyof S]: FunctionChainType<S[k]> & DataOnlyType<S[k]>;
      };
};

type StoreDataAndActionsType = {
  store: any;
  actions: any;
};

type StoreType = "slice" | "group";

type StoreParamsType = {
  store: StoreDataAndActionsType;
  storeType: StoreType;
  storeController: StoreController;
};

type ErrorType = {
  name: string;
  message: string;
  state?: any;
};

type StringObjectType = {
  [k in string]: string;
};

type EventType = "subscription" | "interception";
type InterceptorActionsType =
  | ""
  | "allowAction"
  | "override.value"
  | "override.key"
  | "override.keyAndValue";

export type {
  Store,
  StoreDataAndActionsType,
  StoreParamsType,
  ErrorType,
  StoreType,
  EventType,
  InterceptorActionsType,
  InterceptOptionsType,
  InterceptActionType,
  ChangeHandlerType,
  StringObjectType
};
