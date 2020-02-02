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