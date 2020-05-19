import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/z.js',
  output: {
    file: 'bundle.js',
    format: 'es'
  },
  plugins: [resolve()],
  //   external: [
  //     'js-function-reflector',
  //     'deep-equal',
  //     'flat'
  //   ] 
};
