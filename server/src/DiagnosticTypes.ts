import {
	createConnection,
	TextDocuments,
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
} from 'vscode-languageserver';

export enum DiagnosticType {
	MULTIPLE_DEFINITION,
	INVALID_IDENTIFIER,
	UNUSED_IDENTIFIER,
	UNDEFINED_IDENTIFIER,
	KEYWORD_CLASH,
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
		switch (+type) {
			case DiagnosticType.MULTIPLE_DEFINITION:
				return `Multiple definition of ${isFunc}: ${this.ident}.`;
				break;
			case DiagnosticType.INVALID_IDENTIFIER:
				return `Invalid ${isFunc} identifier: ${this.ident}.`;
				break;
			case DiagnosticType.UNUSED_IDENTIFIER:
				return `Unused ${isFunc}: ${this.ident}.`;
				break;
			case DiagnosticType.UNDEFINED_IDENTIFIER:
				return `Undefined ${isFunc}: ${this.ident}.`;
				break;
			case DiagnosticType.KEYWORD_CLASH:
				return `'${this.ident}' has clashed with a keyword, please rename this ${isFunc}`;
				break;
			case DiagnosticType.UNMATCHED_BLOCK:
				return `'${this.ident}' without '${this.additionalInfo}'`;
				break;
		}
	}

	private getDiagnosticRelatedInfo(type: DiagnosticType) {
		switch (+type) {
			case DiagnosticType.INVALID_IDENTIFIER:
				return "Identifers must start with an underscore ('_') or a letter";
				break;
			case DiagnosticType.UNUSED_IDENTIFIER:
				return `${this.ident} is declared but ${this.isFunc ? "it is never called" : "its value is never read"}`
				break;
		}
	}
}