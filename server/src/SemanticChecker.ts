import {
	Diagnostic,
	DiagnosticSeverity,
} from 'vscode-languageserver';
import { DiagnosticBuilder, DiagnosticType } from './DiagnosticBuilder'

export class DiagnosticsParser {

	private keywordsToTypeMap:Map<string, DiagnosticType> = new Map([
		["Undefined", DiagnosticType.UNDEFINED_IDENTIFIER],
		["Already defined", DiagnosticType.MULTIPLE_DEFINITION],
		["Parameter num mismatch", DiagnosticType.PARAMETER_NUM_MISMATCH],
		["Type mismatch", DiagnosticType.TYPE_MISMATCH],
		["Return in main", DiagnosticType.RETURN_IN_MAIN],
		["Insufficient array rank", DiagnosticType.INSUFFICIENT_ARRAY_RANK],
		["Access to null literal", DiagnosticType.ACCESS_TO_NULL_LITERAL],
		["Empty program body", DiagnosticType.EMPTY_PROGRAM_BODY],
		["Parse Error", DiagnosticType.GENERAL_SYNTAX_ERROR],
		["Invalid integer", DiagnosticType.INVALID_INTEGER]
	]);

	private getIdentName(line: string): string {
		let identPattern = /#([^#]+)#/g;
		let matched: RegExpExecArray | null;
		if (matched = identPattern.exec(line)) {
			return matched[1];
		}
		return "";
	}

	private getAdditionalInfo(line: string): string {
		let additionalMessagePattern = /\^(.+)\^/g;
		let matched: RegExpExecArray | null;
		if (matched = additionalMessagePattern.exec(line)) {
			return matched[1].replace(/\^/g, "");
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

	public parseWarningOutput(text: string, warningMessages: string, 
															 	 db: DiagnosticBuilder): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];
		db.setSeverity(DiagnosticSeverity.Warning);
		if (!(warningMessages === "")) {
			let lines: string[] = warningMessages.split("\n");
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

	private buildDiagnostic(line: string, text: string, 
													db: DiagnosticBuilder, type: DiagnosticType) {
		let ident = this.getIdentName(line);
		let index = this.getIndex(line, text);
		let additionalInfo = this.getAdditionalInfo(line);
		db.setIdent(ident).setStartIndex(index).setAdditionalInfo(additionalInfo);
		if (type == DiagnosticType.UNDEFINED_IDENTIFIER) {
			db.setIsFunc((line.split(/\s+/g)[1]) === "function");
		} else if (type == DiagnosticType.MULTIPLE_DEFINITION) {
			db.setIsFunc((line.split(/\s+/g)[2]) === "function");
		}
		return db.getDiagnostic(type);
	}


	public parseErrorOutput(text: string, errorMessages: string, 
															  db: DiagnosticBuilder): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];
		db.setSeverity(DiagnosticSeverity.Error);
		if (!(errorMessages === "")) {
			let lines: string[] = errorMessages.split("\n");
			lines.forEach(line => {
				this.keywordsToTypeMap.forEach((type: DiagnosticType, keywords: string) => {
					if (line.includes(keywords)) {
						diagnostics = diagnostics.concat(this.buildDiagnostic(line, text, db, type));
					}
				})
			});
		}
		return diagnostics;
	}
}