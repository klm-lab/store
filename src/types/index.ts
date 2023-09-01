/*We exclude other types from suggestions
 * if the key extends one of these below, we return key else
 * We check if next nested key (S[key] extends object), then we join
 * previous key with whatever key from NestedKey of S[Key] and so on
 * until S[Key] not extends object. In that case, we return the key.
 *
 * We infer U to extends string to be sure that we call recursive NestedKey only with a string key
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

/* suggestion for slice and group store based on storeOptions O
 * If o contains storeType: "group", then the user want a grouped store.
 * So the target key can be any nested key and also storeKey.${custom(_A | _D)}
 * in case of a slice store, we have nestedKey and _A | _ D
 * _A is to type the result as chainable actions and _D as all data
 * */
type TargetType<S, O> = O extends StoreOptionsGroup
  ? NestedKeyTypes<S> | DataOrActionsKeyTypes<S>
  : NestedKeyTypes<S> | "_A" | "_D";

type StoreOptionsEverywhere = {
  dispatchMode: "everywhere";
};

type StoreOptionsGroup = {
  storeType: "group";
};

type DefaultStoreOptionsType = {
  storeType?: "group" | "slice";
  dispatchMode?: "hook" | "everywhere";
};

/* Return list a key that are not function.
 * We cast the result as [keyof S & string] to
 * be able to use it like this { [newK in castedResult]: ... }.
 * All keys present in castedResult are not functions
 * */
type NotFunctions<S> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [Key in keyof S & string]: keyof S[Key] extends Function ? string : `${Key}`;
}[keyof S & string];

/* Here we are using the castedResult as mapped key.
 * in order to get key in any key that is not a function
 * */
type DataOnlyType<S> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [key in NotFunctions<S>]: S[key & keyof S];
};

/* Return list a key that is function.
 * We cast the result as [keyof S & string] to
 * be able to use it like this { [newK in castedResult]: ... }.
 * All keys present in castedResult are functions
 * */
type OnlyFunctions<S> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [Key in keyof S & string]: keyof S[Key] extends Function ? `${Key}` : string;
}[keyof S & string];

/* Here we are using the castedResult as mapped key.
 * in order to get key in any key that is a function. Since it is a function
 * We chain it by returning itself
 * */
type FunctionChainType<S> = {
  [key in OnlyFunctions<S>]: (...values: any[]) => FunctionChainType<S>;
};

/* Here we are doing the same thing as FunctionChainType with an exception.
 * The scenario here is a grouped store. And in a grouped store,
 * we first have the groupKey or storeKey then have storeContent.
 * We make the storeKey a function that return all other functions
 * in the groupedStore[groupKey]. It islike we are fist calling
 * groupedStore[groupKey]('called').someFunction().otherFunction()....
 * If we skip this part the groupedStore[groupKey] is not typed callable
 * but typed a value that contains otherFunctions.
 * groupedStore[groupKey]'not called'.someFunction().otherFunction()
 * */
type FunctionKeyType<S> = (...values: any[]) => FunctionChainType<S>;

/* This is the storeOutputType, it's check if the options passed is group
 * then called StoreGroupOutputType else call SliceStoreOutputType with
 * a rewrite type of the state. FunctionChainType rewrites all functions types
 * and DataOnlyType keep definitions as they are. We rewrite functions types
 * so the user can easily in js or ts project know that his function are chainable
 * */
type StoreOutputType<S, O, K extends string> = O extends StoreOptionsGroup
  ? StoreGroupOutputType<S, K>
  : // We rewrite the type of functions to match our definitions and merge others keys as they are
    SliceStoreOutputType<FunctionChainType<S> & DataOnlyType<S>, K>;

/* This is the StoreGroupOutputType,
 *For every k in S, it's check if any keyof state at the current key(k) position
 * keyof S[k] extends a function type, if so, we return the callable function rewrote
 * which return chain actions. If not we just return S[k] because k is part of S.
 *
 * If k is not part of S, then we have k.otherKey. We infer some type to k. It is like we split
 * k.otherKey to [k,otherKey], so we can work with both separately.
 * k extends `${infer firstKey}.${infer otherKey}`. know we check if k extends new inferTypes which is true since we respect eh k string syntax
 * and then check if firstKey is par of S. if so we call StoreGroupOutputType again which S[firstKey]
 * We recursively check every inferred key until firstKey is not a part of S then we return never
 * because we do not know what it is.
 *
 * Fo example, we have some target = "test.data.value". and data = {test: {data: {value: 10}}}.
 *  We check if test.data.value is part of S, and it is not. Valid key are test, data and value.
 * Not test.data.value. Since it is not, we infer firstKey like this
 * `firstKey = "test" and otherKey: "data.value"` and then check again with S[firstKey = "test"] as new State
 * and data.value as newKey which lead us to infer `firstKey = "data"`. secondKey = "value" because
 * data is part of test and value is part of test but data.value is not part of S["test"].
 *  We check again with S["data"] as new State and value as newKey. This time value is part S["data"].
 * We check if (keyof S["data"] which is value )has a type of Function. ex: value = ()=> void or whatever.
 * if so we make value callable, and we make it return itself, so user can do value().value().something else
 * if existed. Now if it is not a function, we just return the type as it is. a number here (10).
 *
 * Now if K (the target passed is not like string.string, where string is part of S), that means something like
 * string.45645, or string.___ or string.anything. Extending or matching K witch our inferred type
 *  will fail when checking if 45645 or ___ is part of S and then called CustomSuggestionType to do come check
 * */
type StoreGroupOutputType<S, K extends string> = K extends keyof S
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    keyof S[K] extends Function
    ? FunctionKeyType<S>
    : S[K]
  : K extends `${infer FirstKey}.${infer SecondKey}`
  ? FirstKey extends keyof S
    ? StoreGroupOutputType<S[FirstKey], SecondKey>
    : never
  : CustomSuggestionType<S, K>;

type SliceStoreOutputType<S, K extends string> = K extends keyof S
  ? S[K]
  : K extends `${infer FirstKey}.${infer SecondKey}`
  ? FirstKey extends keyof S
    ? SliceStoreOutputType<S[FirstKey], SecondKey>
    : never
  : CustomSuggestionType<S, K>;

/*
 * In CustomSuggestionType, we check if K extends one of our suggestion
 * (_A | _D) and return according type otherwise we return never
 * */
type CustomSuggestionType<S, K> = K extends "_A"
  ? FunctionChainType<S>
  : K extends "_D"
  ? DataOnlyType<S>
  : never;

/* Interface allow me to override definitions with same name, same params with optional one or not
 * One for optional target which return the generic. sliceStore scenario
 * and one of required target which return type based on target grouped store scenario.
 * !!! Replacing interface by conditional types doesn't work!!! Do not lose time trying.
 * */

/* This one 'StoreFunctionType' has required target params and return the storeOutput type
 * based on target and options passed
 * */
interface StoreFunctionType<S, O> {
  <TargetKey extends string>(
    /* At my opinion, this line is not necessary and can be removed lead us to rewrote interface like this
     * interface StoreFunctionType<S, O> {
     *  <TargetKey extends TargetType<S, O>>(
     *      target: TargetKey,
     *      willDefineLater?: boolean
     *   ): StoreOutputType<S, O, TargetKey>
     * }
     * But for a reason that ignore, it doesn't work. The workaround found with help on stackoverflow
     * is TargetKey extends TargetType<S, O> ? TargetKey : TargetType<S, O>
     * */
    target: TargetKey extends TargetType<S, O> ? TargetKey : TargetType<S, O>,
    willDefineLater?: boolean
  ): StoreOutputType<S, O, TargetKey>;
}

/* This one 'StoreFunctionType' has optional target params and return the storeOutput type
 * based on target and options passed
 * */
interface StoreFunctionType<S, O> {
  <targetKey extends string>(
    target?: targetKey extends TargetType<S, O> ? targetKey : TargetType<S, O>,
    willDefineLater?: boolean
  ): O extends StoreOptionsGroup
    ? /* We rewrite the type of functions to match our definitions and merge others keys as they are.
       * But for group we extract first key and rewrite S[key],
       * because the firstKey of groupStore can never be a function
       */
      {
        [k in keyof S]: FunctionChainType<S[k]> & DataOnlyType<S[k]>;
      }
    : /* We rewrite the type of functions to match our definitions and merge others keys as they are
       * This is a sliceStore some S[Key] can be function
       **/
      FunctionChainType<S> & DataOnlyType<S>;
}

/* StoreObjectType based on options returns an external dispatcher with a hook store
 * or only a hook store. if the external dispatcher is return, it will only contain actions.
 * So we chain those actions. Remember in a group, rootStore keys can never be function. So same principe
 * we extract rootKey and chain nested ones
 * */
type StoreObjectType<S, O> = O extends StoreOptionsEverywhere
  ? {
      dispatcher: O extends StoreOptionsGroup
        ? {
            [k in keyof S]: FunctionChainType<S[k]>;
          }
        : FunctionChainType<S>;

      useStore: StoreFunctionType<S, O>;
    }
  : StoreFunctionType<S, O>;

/*
 * CreateStoreType. if the options is passed as undefined
 * For example, createStore(store,undefined), we return the store as a function (hook)
 * else as an object. See StoreObjectType for more details
 * */
type CreateStoreType<S, O> = O extends undefined
  ? StoreFunctionType<S, O>
  : StoreObjectType<S, O>;

type StoreDataAndActionsType = {
  store?: any;
  actions?: any;
};

type UserParamsType = {
  paths: string[];
  target?: string;
  willDefineLater?: boolean;
};

type StoreParamsType = {
  store: StoreDataAndActionsType;
  storeType: "slice" | "group";
};

type ErrorType = {
  name: string;
  message: string;
  stack?: string;
  matchKey?: string;
  state?: any;
};

export type {
  CreateStoreType,
  StoreFunctionType,
  DefaultStoreOptionsType,
  StoreDataAndActionsType,
  UserParamsType,
  StoreParamsType,
  ErrorType
};
