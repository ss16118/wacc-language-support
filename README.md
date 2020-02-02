# Wacc Language Support

This is a VS Code extension written for the WACC language used in the compiler course of Imperial College London.

WACC is a simple variant on the While family of languages. It features all of the common language constructs such as program variables, simple expressions, conditional branching, looping and no-ops. It also features a rich set of extra constructs, such as simple types, functions, arrays, and basic tuple creation on the heap.

## Features

Since this is the very first version of the extension, it only provides basic syntax highlighting for the WACC language. More features, such as auto-complete and a full WACC compiler, are expected to be added in the future.

## Release Notes

### 1.0.0: 2020/1/31

Initial release of WACC language support:
provides simple syntax highlighting for the WACC language.

### 1.1.0: 2020/2/1
Added language server and provided code diagnostics and error highlight for identifiers.
Issue: code diagnostics does not recognize scopes.