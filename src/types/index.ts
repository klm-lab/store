type Unknown = any;
type StoreKeys<S> = {
  [Key in keyof S & string]: S[Key] extends
    | Map<any, any>
    | Date
    | Set<any>
    | Array<any>
    ? Key
    : S[Key] extends object
    ? `${Key}` | `${Key}.${StoreKeys<S[Key]>}`
    : `${Key}`;
}[keyof S & string];

type StoreDataKey<S> = "*" | StoreKeys<S>;

type StoreDataByTarget<S, K> = K extends keyof S
  ? S[K]
  : K extends `${infer FirstKey}.${infer SecondKey}`
  ? FirstKey extends keyof S
    ? StoreDataByTarget<S[FirstKey], SecondKey>
    : never
  : CustomSuggestionType<S, K>;

type CustomSuggestionType<S, K> = K extends "*" ? S : never;

type FunctionType = (...args: any) => any;
type EqualityCheck = (arg1: Unknown, arg2: Unknown) => boolean;

interface GetStoreRef<S> {
  (storeRef: S): void;
}

// interface StoreType<S> {
//   set(getStoreRef: GetStoreRef<S>): void;
//   get<Target>(
//     target: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>
//   ): StoreDataByTarget<S, Target>;
//
//   //get<T extends Selector<S>>(selector: T): ReturnType<T>;
//
//   get(): S;
//
//   listen<Target>(
//     target: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>,
//     callback: (data: StoreDataByTarget<S, Target>) => void
//   ): () => void;
//
//   <Target>(
//     target: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>
//   ): StoreDataByTarget<S, Target>;
//
//   (): S;
// }

interface Selector<S> {
  (store: S): unknown;
}

interface StoreType<S> {
  set(getStoreRef: GetStoreRef<S>): void;
  // selector
  get<Target extends Selector<S>>(target: Target): ReturnType<Target>;
  // suggestion
  get<Target>(
    target: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>
  ): StoreDataByTarget<S, Target>;
  // selector
  get<T extends Selector<S> | StoreDataKey<S>>(
    selector: T
  ): T extends Selector<S> ? ReturnType<T> : StoreDataByTarget<S, T>;

  get(): S;

  listen<Target>(
    target: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>,
    callback: (data: StoreDataByTarget<S, Target>) => void,
    equalityCheck?: EqualityCheck
  ): () => void;
  // selector
  <Target extends Selector<S>>(
    target: Target,
    equalityCheck?: EqualityCheck
  ): ReturnType<Target>;
  // string output
  <Target>(
    target: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>,
    equalityCheck?: EqualityCheck
  ): StoreDataByTarget<S, Target>;
  // string sugg
  <T extends Selector<S> | StoreDataKey<S>>(
    selector: T,
    equalityCheck?: EqualityCheck
  ): T extends Selector<S> ? ReturnType<T> : StoreDataByTarget<S, T>;
  (): S;
}

export type { StoreType, FunctionType, Unknown, EqualityCheck };
