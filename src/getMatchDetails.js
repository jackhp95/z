const functionReflector = require('js-function-reflector')

export default function (matchFunction) {
  const reflectedFunction = functionReflector.call(this, matchFunction)

  return {
    args: reflectedFunction.args,
    func: matchFunction
  }
}
