// Static image imports (e.g. `import logo from './a-white.png'`) resolve through Metro,
// but TypeScript needs an ambient declaration for them. `require()` is already typed by expo/types.
declare module '*.png';
