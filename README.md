# Wacc Language Support

This is a VS Code extension written for the WACC language used in the compiler course of Imperial College London.

WACC is a simple variant on the While family of languages. It features all of the common language constructs such as program variables, simple expressions, conditional branching, looping and no-ops. It also features a rich set of extra constructs, such as simple types, functions, arrays, and basic tuple creation on the heap.

## Features

Since this is the very first version of the extension, it only provides basic syntax highlighting for the WACC language. More features, such as auto-complete and a full WACC compiler, are expected to be added in the future. 
__This extension only supports the most basic version of WACC as defined in the specs.__

- [x] Syntax highlighting
- [ ] Autocomplete (in progress)
- [x] Code diagnostics
- [ ] WACC compiler

## Release Notes

### 1.0.0: 2020/1/31

Initial release of WACC language support:
provides simple syntax highlighting for the WACC language.

### 1.1.0: 2020/2/1
Added language server and provided code diagnostics and error highlight for identifiers.
The language server is based on the example from this [repo]("https://github.com/Microsoft/vscode-extension-samples").

Issue: code diagnostics does not recognize scopes. Auto-complete and other more
complicated code diagnostics will be added later.

### 1.2.0 2020/2/4
Added autocomplete of code and code snippets for generating functions, code blocks,
if-statements and while-loops.

### 2.0.0 2020/2/7 [Major Update]
This extension now takes advantage of the WACC compiler to correctly identify
scopes. It is now able to recognize unused variables and multiple definitions of the
same variable in different scopes.

### 2.1.0 2020/3/4 [Major Update]
The extension now catches most of the syntactic and semantic errors while writing
a WACC program. It has to be noted that the messages prompted for syntactic errors
might not be very informative since they are taken simply from ANTLR.

__A full WACC compiler will soon be added to the extension__