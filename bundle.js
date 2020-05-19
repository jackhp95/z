import functionReflector from 'js-function-reflector';
import deepEqual from 'deep-equal';
import flatten from 'flat';

function getMatchDetails (matchFunction) {
  const reflectedFunction = functionReflector.call(this, matchFunction);

  return {
    args: reflectedFunction.args,
    func: matchFunction
  }
}

function getPropByString (obj, propString) {
  if (!propString) {
    return obj
  }

  let i;
  let iLen;
  let prop;
  let props = propString.split('.');

  for (i = 0, iLen = props.length - 1; i < iLen; i++) {
    prop = props[i];

    const candidate = obj[prop];
    if (candidate !== undefined) {
      obj = candidate;
    } else {
      break
    }
  }
  return obj[props[i]]
}

var objectEquals = (a, b) => {
  const objectEquals = (objectA, nestedKeys = []) => {
    if (objectA.constructor === Object) {
      const keys = Object.keys(objectA);

      for (var i in keys) {
        const key = keys[i];
        const nestedClone = nestedKeys.slice(0);
        nestedClone.push(key);

        const valueA = getPropByString(a, nestedClone.join('.'));
        const valueB = getPropByString(b, nestedClone.join('.'));

        if (
          !(valueA instanceof Object) &&
          !(valueB instanceof Object) &&
          valueA !== valueB
        ) {
          return false
        }

        if (
          (valueA instanceof Array) &&
          (valueB instanceof Array) &&
          !deepEqual(valueA, valueB)
        ) {
          return false
        }

        const partialResult = objectEquals(objectA[key], nestedClone);
        if (partialResult === false) {
          return false
        }
      }
    }

    return true
  };

  return objectEquals(a)
};

var option = {
  Some: (value) => ({ value, hasValue: true }),
  None: {}
};

var match = (match, subjectToMatch) => {
  const hasMatchValue = match.args[0].length >= 2;
  if (!hasMatchValue) {
    return option.Some(subjectToMatch)
  }

  const matchValue = match.args[0][1];

  // if is a type check, check type
  if (matchValue === Boolean && typeof subjectToMatch === 'boolean') {
    return option.Some(subjectToMatch)
  }
  if (matchValue === undefined && typeof subjectToMatch === 'undefined') {
    return option.Some(subjectToMatch)
  }
  if (matchValue === Number && typeof subjectToMatch === 'number') {
    return option.Some(subjectToMatch)
  }
  if (matchValue === String && typeof subjectToMatch === 'string') {
    return option.Some(subjectToMatch)
  }
  if (matchValue === Object && typeof subjectToMatch === 'object') {
    return option.Some(subjectToMatch)
  }

  // if is instance check, check instance
  if (
    typeof matchValue === 'function' &&
    subjectToMatch instanceof matchValue
  ) {
    return option.Some(subjectToMatch)
  }

  // if it is a regex, and the value is a string, test that it matches
  if (matchValue instanceof RegExp && typeof subjectToMatch === 'string') {
    if (matchValue.test(subjectToMatch)) {
      return option.Some(subjectToMatch)
    }
  }

  // if its array
  if (
    subjectToMatch instanceof Array &&
    matchValue instanceof Array
  ) {
    if (deepEqual(subjectToMatch, matchValue)) {
      return option.Some(subjectToMatch)
    }
  }

  // if is object (and not an array), check if contains
  if (typeof subjectToMatch === 'object' && subjectToMatch !== null && !(subjectToMatch instanceof Array) && typeof matchValue === 'object') {
    if (objectEquals(matchValue, subjectToMatch)) {
      return option.Some(subjectToMatch)
    }
  }

  // if is value check, check value
  if (subjectToMatch === matchValue) {
    return option.Some(subjectToMatch)
  }

  return option.None
};

var matchArray = (currentMatch, subjectToMatch) => {
  const matchArgs = currentMatch.args.map(
    (x, index) =>
      Array.isArray(x) ? { key: x[0], value: x[1], index } : { key: x, index }
  );

  if (subjectToMatch.length < matchArgs.length) {
    const matchOnSubArg = (arg, toMatch) => 'value' in arg
      ? deepEqual(arg.value, toMatch)
      : true;

    const matchAllSubArgs = matchArgs
      .slice(0, matchArgs.length - 1)
      .every((arg, index) => matchOnSubArg(arg, subjectToMatch[index]));

    if (matchAllSubArgs && deepEqual(matchArgs[matchArgs.length - 1].value, [])) {
      return option.Some(subjectToMatch[0])
    }

    return option.None
  }

  const heads = Array.from(
    Array(matchArgs.length - 1),
    (x, y) => subjectToMatch[y]
  );
  const tail = subjectToMatch.slice(matchArgs.length - 1);

  // CAUTION: it gets the tail arg and removes from matchArgs (due splice function)
  const [tailArg] = matchArgs.splice(matchArgs.length - 1, 1);
  if (tailArg.value) {
    const matchObject = { args: [[undefined, tailArg.value]] };
    const matchResult = match(matchObject, tail);
    if (matchResult === option.None) {
      return option.None
    }
  }

  const headsWithArgs = matchArgs.filter(x => x.value);
  for (let i = 0; i < headsWithArgs.length; i++) {
    const matchObject = {
      args: [[headsWithArgs[i].key, headsWithArgs[i].value]]
    };

    const matchResult = match(matchObject, heads[headsWithArgs[i].index]);
    if (matchResult === option.None) {
      return option.None
    }
  }

  return option.Some(heads.concat([tail]))
};

// runtime type check for debugging purposes
const checkArray = xs => {
  if (!Array.isArray(xs)) {
    throw new Error('matchObject expects a list of strings')
  }

  return xs
};

// standard compose function

const compose = (...fns) => x => fns.reduceRight((v,f) => f(v) , x);

// intended to take a single char and return true if it is a letter or number
const isChar = x => /[a-zA-Z0-9]/.test(x);

// takes two lists and returns true if all of the elements in the first
// list are present in the second list
const containsAll = (xs, ys) =>
  xs.map(x => y => y.includes(x)).reduce((res, f) => f(ys) && res, true);

// checks if a reflected list of arguments contains
// object destructuring syntax
const hasDestructuredObjectArguments = xs =>
  xs.some(x => /({|})/.test(x) && !/function/.test(x));

// This is just an approach for deriving an actual js object
// from the punned syntax of object destructuring in the
// function argument reflection, that object can then
// be used to check the keys of the subjectToMatch
const buildSpecFromReflectedArgs = str =>
  [...str].reduce((res, curr, i) => {
    switch (true) {
      // add a dummy value when a key without a value is found
      case /(,|})/.test(curr) && isChar(str.charAt(i - 1)):
        return res.concat('":1').concat(curr)

      // add a opening quote to keynames that are missing them
      case isChar(curr) && !isChar(str.charAt(i - 1)):
      // add a closing quote to keynames that are missing them
      /* falls through */
      case curr === ':' && str.charAt(i - 1) !== '"':
        return res.concat('"').concat(curr)

      default:
        return res.concat(curr)
    }
  }, '');

// derive a flattened list of keys|paths from an object
const getFlattenedKeys = compose(Object.keys, flatten);

const getFlattenedKeysFromArgs = compose(
  getFlattenedKeys,
  JSON.parse,
  // add dummy values so an object can be parsed from the args
  buildSpecFromReflectedArgs,
  // join the args back into original string
  xs => xs.join(','),
  // throw an error if passed a non array
  checkArray
);

const objectAndArgsDestructureMatches = (reflectedArgs, subjectToMatch) =>
  containsAll(
    getFlattenedKeysFromArgs(reflectedArgs),
    getFlattenedKeys(subjectToMatch)
  );

const resolveMatchFunctions = (subjectToMatch, functions, scope) => {
  for (let i = 0; i < functions.length; i++) {
    const currentMatch = getMatchDetails.call(scope, functions[i]);

    const matchHasSingleArgument = currentMatch.args.length === 1;
    if (matchHasSingleArgument) {
      const singleValueResolve = match(currentMatch, subjectToMatch);
      if (singleValueResolve.hasValue) {
        return currentMatch.func(singleValueResolve.value)
      }
    }

    const matchHasMultipleArguments = currentMatch.args.length > 1;
    if (matchHasMultipleArguments && Array.isArray(subjectToMatch)) {
      const multipleItemResolve = matchArray(currentMatch, subjectToMatch);
      if (
        multipleItemResolve.hasValue &&
        Array.isArray(multipleItemResolve.value)
      ) {
        return currentMatch.func.apply(null, multipleItemResolve.value)
      }

      if (multipleItemResolve.hasValue) {
        return currentMatch.func(multipleItemResolve.value)
      }
    }

    if (
      hasDestructuredObjectArguments(currentMatch.args) &&
      objectAndArgsDestructureMatches(currentMatch.args, subjectToMatch)
    ) {
      return currentMatch.func(subjectToMatch)
    }
  }
};

const matches = (subjectToMatch) => function (...functions) {
  return resolveMatchFunctions(subjectToMatch, functions, this)
};

export { matches };
