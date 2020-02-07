# Change Log

All notable changes to the "wacc-language-support" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## Initial release [1.0.0] - 2020.1.31
### Added
- Basic syntax highlighting for WACC language.

### [1.0.1] - 2020.1.31
### Added
- Self-designed icon for WACC

### [1.1.0] - 2020.2.1
### Added
- Language server
- Simple code diagnostics for identifiers
- New icon for WACC
### Changed
- Identifiers that are all capitalized are highlighted using a more noticeable color

### [1.1.1] - 2020.2.2
### Changed
- Fixed bug: if a function has the same identifier as a variable, and they are both
unused, only the function will be highlighted.

### [1.2.0] - 2020.2.4
### Added
- Auto complete for WACC keywords and identifiers that have been defined.
- Code snippets to generate code blocks for functions, if-statements, while-loops
and code blocks.
### Changed
- Fixed bug: keywords such as 'null', 'fst' and 'snd' will no longer be falsely
identified as identifiers.

### [1.2.1] - 2020.2.5
### Added
- Keywords that mark different scopes can now be identified. For instance,
when an if-statement is missing an 'fi', it will prompt the user with an error message.
### Changed
- Fixed bug: keywords "true" and "false" are no longer categorized as identifers
by code diagnostics.
- Fixed bug: 'pair(T, T)' will no longer be categorized as a valid type if there
is a space between 'pair' and '('.

### [1.2.2] - 2020.2.5
### Changed
- Fixed bug: nested pair type can now be identified correctly.

### [1.2.3] - 2020.2.5
### Changed
- Fixed bug: in the previous version, if a scope keyword is followed by a ';',
the scopes would not be correctly identified. This bug is now fixed.
- Fixed bug: code snippets not working properly.

### [2.0.0] - 2020.2.7
### Added:
- The extension now correctly recognizes scopes with the help of a WACC compiler.
It has to be taken into account that the performance of the extension might be worse.
### Changed
- Fixed bug: syntax highlighting failed when coloring a function header with more
than two parameters. Now it highlights the function signature correctly no matter
how many parameters there are.
- Fixed bug: syntax highlighting misidentified identifiers that have type names
in them as types. Now it correctly marks them as variables (or functions).