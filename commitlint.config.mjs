/**
 * tender commitlint config — mirrors the fleet's conventions.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    'subject-case': [0],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
    'header-max-length': [2, 'always', 100],
    // Dependabot commit bodies contain long release-note URLs that exceed
    // the default 100-char body-max-line-length. Disable the rule for
    // bot-authored commits compatibility; subjects are still capped.
    'body-max-line-length': [0, 'always'],
  },
};
