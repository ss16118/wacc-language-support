import {
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
} from 'vscode-languageserver';

export enum DiagnosticType {
	MULTIPLE_DEFINITION,
	INVALID_IDENTIFIER,
	UNUSED_IDENTIFIER,
	UNDEFINED_IDENTIFIER,
	TYPE_MISMATCH,
	RETURN_IN_MAIN,
	ACCESS_TO_NULL_LITERAL,
	PARAMETER_NUM_MISMATCH,
	INSUFFICIENT_ARRAY_RANK,
	EMPTY_PROGRAM_BODY,
	KEYWORD_CLASH,
	GENERAL_SYNTAX_ERROR,
	INVALID_INTEGER,
	UNMATCHED_BLOCK
};

export class DiagnosticBuilder {

	private ident: string = "";
	private additionalInfo: string = "";
	private startIndex: number = 0;
	private textDocument: TextDocument;
	private isFunc: boolean = false;
	private hasDiagnosticRelatedInformationCapability: boolean;
	private severity: DiagnosticSeverity = DiagnosticSeverity.Error;

	private provideRelatedInfoTypes: DiagnosticType[] = [
		DiagnosticType.INVALID_IDENTIFIER,
		DiagnosticType.UNUSED_IDENTIFIER
	];

	constructor (textDocument: TextDocument,
							 hasDiagnosticRelatedInformationCapability: boolean) {
		this.textDocument = textDocument;
		this.hasDiagnosticRelatedInformationCapability = hasDiagnosticRelatedInformationCapability;
	}

	public setIdent(ident: string): DiagnosticBuilder {
		this.ident = ident;
		return this;
	}

	public setStartIndex(startIndex: number): DiagnosticBuilder {
		this.startIndex = startIndex;
		return this;
	}

	public setIsFunc(isFunc: boolean): DiagnosticBuilder {
		this.isFunc = isFunc;
		return this;
	}

	public setAdditionalInfo(additionalInfo: string): DiagnosticBuilder {
		this.additionalInfo = additionalInfo;
		return this;
	}

	public setSeverity(severity: DiagnosticSeverity): DiagnosticBuilder {
		this.severity = severity;
		return this;
	}

	public getDiagnostic(type: DiagnosticType) {
		let diagnostic: Diagnostic = {
			severity: this.severity,
			range: {
				start: this.textDocument.positionAt(this.startIndex),
				end: this.textDocument.positionAt(this.startIndex + this.ident.length)
			},
			message: this.getDiagnosticMessage(type)!,
			source: 'ex'
		};
		if (this.hasDiagnosticRelatedInformationCapability &&
				this.provideRelatedInfoTypes.includes(type)) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: this.textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: this.getDiagnosticRelatedInfo(type)!
				}
			];
		}
		return diagnostic;
	}


	private getDiagnosticMessage(type: DiagnosticType) {
		let isFunc = this.isFunc ? "function" : "variable";
		switch (type) {
			case DiagnosticType.MULTIPLE_DEFINITION:
				return `Multiple definition of ${isFunc}: ${this.ident}.`;
			case DiagnosticType.INVALID_IDENTIFIER:
				return `Invalid ${isFunc} identifier: ${this.ident}.`;
			case DiagnosticType.UNUSED_IDENTIFIER:
				return `Unused ${isFunc}: ${this.ident}.`;
			case DiagnosticType.UNDEFINED_IDENTIFIER:
				return `Undefined ${isFunc}: ${this.ident}.`;
			case DiagnosticType.RETURN_IN_MAIN:
				return "Cannot have 'return' statement in main";
			case DiagnosticType.TYPE_MISMATCH:
				return `${this.additionalInfo}`;
			case DiagnosticType.ACCESS_TO_NULL_LITERAL:
				return `${this.additionalInfo}`;
			case DiagnosticType.PARAMETER_NUM_MISMATCH:
				return `${this.additionalInfo}`;
			case DiagnosticType.INSUFFICIENT_ARRAY_RANK:
				return `${this.additionalInfo}`;
			case DiagnosticType.EMPTY_PROGRAM_BODY:
				return `Empty program body!`;
			case DiagnosticType.KEYWORD_CLASH:
				return `'${this.ident}' has clashed with a keyword, please rename this ${isFunc}`;
			case DiagnosticType.UNMATCHED_BLOCK:
				return `'${this.ident}' without '${this.additionalInfo}'`;
			case DiagnosticType.GENERAL_SYNTAX_ERROR:
				return `${this.additionalInfo}`;
			case DiagnosticType.INVALID_INTEGER:
				return `Invalid integer: a 32-bit integer has to be from -2147483648 to 2147483647`;
		}
	}

	private getDiagnosticRelatedInfo(type: DiagnosticType) {
		switch (type) {
			case DiagnosticType.INVALID_IDENTIFIER:
				return "Identifers must start with an underscore ('_') or a letter";
			case DiagnosticType.UNUSED_IDENTIFIER:
				return `${this.ident} is declared but ${this.isFunc ? "it is never called" : "its value is never read"}`
		}
	}
}