module.exports = {
  "extends": "google",
  "parser": 'babel-eslint',
  "rules": {
    "semi": ["error", "always"],
    "quotes": ["error", "single"],
    "no-empty": ["error",  {"allowEmptyCatch": true}],
    "no-console": 1,
    "no-debugger": 2,
    "comma-dangle": ["error", "never"],
    "require-jsdoc": ["error", {
        "require": {
            "FunctionDeclaration": false,
            "MethodDefinition": false,
            "ClassDeclaration": false,
            "ArrowFunctionExpression": false
        }
    }],
  },
  "globals": {}
};
