# Change Log

All notable changes to the "wacc-language-support" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

### [2.2.1] - 2020.3.7
### Changed
- The '\n' character in the refEmulate file is converted from Windows format
to Unix format.

### [2.2.0] - 2020.3.5
### Added
- An ARM emulator and a command for executing the current WACC file 
(See README for more details).

### [2.1.0] - 2020.3.4
### Added
- Diagnostics for the following error types:
	- Multiple definitions of variables in the same scope and functions
	- Type mismatch
	- Return in main
	- Access to null literals
	- Parameter number mismatch
	- Insufficient array rank
	- Empty program body
	- General syntactic errors
	- Invalid integer
### Changed
- Code refactoring in SemanticChecker and DiagnosticBuilder.
- Fixed bug: added syntax highlighting for 'fst' and 'snd'.

### [2.0.3] - 2020.2.7
### Changed
- Improvement : path to the extension no longer needs to be updated manually in the
source code files. It is now detected from the client side and send to the server
side at the start.
- Fixed bug: minor bug in SemanticChecker.

### [2.0.2] - 2020.2.7
### Changed
- Fixed bug: syntax highlighting did not recognize some of the keywords when
there is no whitespace between tokens. Now it is fixed.
- Fixed bug: scope recognition no longer fails when there is no whitespace
between some of the keywords and other tokens.

### [2.0.1] - 2020.2.7
### Changed
- Fixed bug: code diagnostics could not find the correct path for the WACC compiler.
Now this bug is fixed.
- Fixed bug: code diagnostics no longer produces redundant messages.

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

### [1.2.3] - 2020.2.5
### Changed
- Fixed bug: in the previous version, if a scope keyword is followed by a ';',
the scopes would not be correctly identified. This bug is now fixed.
- Fixed bug: code snippets not working properly.

### [1.2.2] - 2020.2.5
### Changed
- Fixed bug: nested pair type can now be identified correctly.

### [1.2.1] - 2020.2.5
### Added
- Keywords that mark different scopes can now be identified. For instance,
when an if-statement is missing an 'fi', it will prompt the user with an error message.
### Changed
- Fixed bug: keywords "true" and "false" are no longer categorized as identifers
by code diagnostics.
- Fixed bug: 'pair(T, T)' will no longer be categorized as a valid type if there
is a space between 'pair' and '('.

### [1.2.0] - 2020.2.4
### Added
- Auto complete for WACC keywords and identifiers that have been defined.
- Code snippets to generate code blocks for functions, if-statements, while-loops
and code blocks.
### Changed
- Fixed bug: keywords such as 'null', 'fst' and 'snd' will no longer be falsely
identified as identifiers.

### [1.1.1] - 2020.2.2
### Changed
- Fixed bug: if a function has the same identifier as a variable, and they are both
unused, only the function will be highlighted.

### [1.1.0] - 2020.2.1
### Added
- Language server
- Simple code diagnostics for identifiers
- New icon for WACC
### Changed
- Identifiers that are all capitalized are highlighted using a more noticeable color

### [1.0.1] - 2020.1.31
### Added
- Self-designed icon for WACC

## Initial release [1.0.0] - 2020.1.31
### Added
- Basic syntax highlighting for WACC language.

## [Unreleased]