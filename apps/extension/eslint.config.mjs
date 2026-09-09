import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.output/**', '.wxt/**', 'node_modules/**'],
  },
  ...tseslint.configs.recommended,
);
