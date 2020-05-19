import functionReflector from 'js-function-reflector'

export  function (matchFunction) {
  const reflectedFunction = functionReflector.call(this, matchFunction)

  return {
    args: reflectedFunction.args,
    func: matchFunction
  }
}
