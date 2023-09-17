type StoreKeys<S> = {
  [Key in keyof S & string]: S[Key] extends
    | Map<any, any>
    | Date
    | Set<any>
    | Array<any>
    ? Key
    : S[Key] extends FunctionType
    ? never
    : S[Key] extends object
    ? `${Key}` | `${Key}.${StoreKeys<S[Key]>}`
    : `${Key}`;
}[keyof S & string];

type StoreDataKey<S> = "*" | StoreKeys<S>;

type ExcludeFunctions<S> = {
  [Key in keyof S]: S[Key] extends FunctionType ? never : Key;
}[keyof S];

type StoreData<S> = {
  [key in ExcludeFunctions<S>]: S[key];
};

type IncludeFunctions<S> = {
  [Key in keyof S]: S[Key] extends FunctionType ? Key : never;
}[keyof S];

type StoreActions<S> = {
  [key in IncludeFunctions<S>]: (...values: unknown[]) => StoreActions<S>;
};

type StoreDataByTarget<S, K> = StoreDataOutput<S, K>;

type StoreDataOutput<S, K> = K extends keyof S
  ? keyof S[K] extends FunctionType
    ? never
    : S[K]
  : K extends `${infer FirstKey}.${infer SecondKey}`
  ? FirstKey extends keyof S
    ? StoreDataOutput<S[FirstKey], SecondKey>
    : never
  : CustomSuggestionType<S, K>;

type CustomSuggestionType<S, K> = K extends "*" ? StoreData<S> : never;

type SubscribeType = {
  [k in string]: Set<FunctionType>;
};

type FunctionType = (...args: unknown[]) => unknown;
type DispatchType = (event: string) => void;

type Store<S> = {
  getActions: () => StoreActions<S>;
  getSnapshot: <Target extends StoreDataKey<S>>(
    target?: Target
  ) => StoreDataByTarget<S, Target>;
  dispatcher: StoreActions<S>;
  listen: <Target extends StoreDataKey<S>>(
    event: Target,
    callback: (data: StoreDataByTarget<S, Target>) => void
  ) => () => void;
  <Target extends StoreDataKey<S>>(
    target?: Target
    // check if target is passed, NonNullable help us by excluding null and undefined
  ): Target extends NonNullable<string>
    ? // Target is present
      StoreDataByTarget<S, Target>
    : // Target is not present.
      StoreData<S>;
};

type ErrorType = {
  name: string;
  message: string;
  state?: any;
};

export type { Store, ErrorType, FunctionType, SubscribeType, DispatchType };
