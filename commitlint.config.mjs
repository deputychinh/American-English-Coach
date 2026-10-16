export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'repo',
        'plan',
        'docs',
        'api',
        'ml',
        'web',
        'content',
        'legacy',
        'infra',
        'ci',
        'e2e',
        'deps',
      ],
    ],
  },
};
