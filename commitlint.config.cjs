module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'perf', 'refactor', 'test', 'ci'],
    ],
    'subject-max-length': [2, 'always', 100],
  },
};
