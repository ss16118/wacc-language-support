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
	TextDocumentPositionParams
} from 'vscode-languageserver';
import { DiagnosticBuilder, DiagnosticType } from './DiagnosticBuilder'

export class SemanticChecker {

	private semanticErrors = "";
	private warningMessages = "";
	public getSemanticErrors(errors: string) {
		let semanticPattern = /\bsemantic error(s)?:/g;
		let matched: RegExpExecArray | null;
		if (!(errors === "") &&
				 (matched = semanticPattern.exec(errors))) {
			this.semanticErrors = errors.substring(matched.index + matched[0].length, errors.length);
		}
		this.semanticErrors = "";
	}

	public getWarningMessages(errors: string): string {
		let warningPattern = /\bwarning(s)?:/g;
		let matched: RegExpExecArray | null;
		if (!(errors === "") &&
				 (matched = warningPattern.exec(errors))) {
			this.warningMessages = errors.substring(matched.index + matched[0].length, errors.length);
		}
		return "";
	}

	private getIdentName(line: string): string {
		let identPattern = /'(\w+)'/g;
		let matched: RegExpExecArray | null;
		if (matched = identPattern.exec(line)) {
			return matched[1];
		}
		return "";
	}

	private getIndex(line: string, text: string): number {
		let indexPattern = /\|\s*\((\d+), (\d+)\)/g;
		let lineNum: number = 0;
		let charPos: number = 0;
		let matched: RegExpExecArray | null;
		if (matched = indexPattern.exec(line)) {
			lineNum = Number(matched[1]);
			charPos = Number(matched[2]);
		}
		let progLines: string[] = text.split("\n");
		let index = 0;
		let count = 1;
		for (line of progLines) {
			if (count == lineNum) {
				return index + charPos;
			}
			index += line.length + 1;
			count++;
		}
		return index;
	}

	public getSemanticWarnings(text: string, db: DiagnosticBuilder): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];
		db.setSeverity(DiagnosticSeverity.Warning);
		if (!(this.warningMessages === "")) {
			let lines: string[] = this.warningMessages.split("\n");
			lines.forEach(line => {
				if (line.includes("Unused variable")) {
					let ident = this.getIdentName(line);
					let index = this.getIndex(line, text);
					db.setIdent(ident).setStartIndex(index).setIsFunc(false);
					diagnostics.push(db.getDiagnostic(DiagnosticType.UNUSED_IDENTIFIER));
				}
			});
		}
		return diagnostics;
	}


	public getSemanticDiagnostics(text: string, db: DiagnosticBuilder): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];
		db.setSeverity(DiagnosticSeverity.Error);
		if (!(this.semanticErrors === "")) {
			let lines: string[] = this.semanticErrors.split("\n");
			lines.forEach(line => {
				if (line.includes("Undefined variable")) {
					let ident = this.getIdentName(line);
					let index = this.getIndex(line, text);
					db.setIdent(ident).setStartIndex(index).setIsFunc(false);
					diagnostics.push(db.getDiagnostic(DiagnosticType.UNDEFINED_IDENTIFIER));
				}
				if (line.includes("Already defined")) {
					let ident = this.getIdentName(line);
					let index = this.getIndex(line, text);
					db.setIdent(ident).setStartIndex(index).setIsFunc(false);
					diagnostics.push(db.getDiagnostic(DiagnosticType.MULTIPLE_DEFINITION));
				}
			});
		}
		return diagnostics;
	}

}