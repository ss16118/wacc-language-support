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
import { start } from 'repl';
import { sign } from 'crypto';
import { DiagnosticType, DiagnosticBuilder } from './DiagnosticTypes';
import { Scope, IdentAttributes } from './scope';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

let waccKeywords: string[] = [
	"skip", "read", "free", "return", "exit", "print",
	"println", "if", "then", "else", "fi", "while", "is",
	"do", "done", "begin", "end", ";", "len", "chr", "ord", "call", "newpair",
	"fst", "snd", "null", "true", "false"
];

let waccTypes: string[] = [
	"int", "bool", "char", "string", "pair"
];

let codeBlockScopeNodes: Scope[] = [];
let whileScopeNodes: Scope[] = [];
let ifScopeNodes: Scope[] = [];

let variables: Map<string, IdentAttributes> = new Map();
let methods: Map<string, MethodSignature> = new Map();

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: true
			}
		}
	};
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

/*******************************************************************/
/*                           Diagnostics                           */
/*******************************************************************/

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

class MethodSignature {
	public occurrences: number;
	public parameters: string[] = [];
	public indices: number[] = [];
	constructor(occurrences: number, index: number) {
		this.occurrences = occurrences;
		this.indices.push(index);
	}
}

function getDefinedIdents(text: string) {
	let definedVarPattern = /\b((?:int|bool|char|string|(?:pair\(\s*\w+,\s*\w+\s*\)))\s*(?:(?:\[\])*)?)\s+(\w+)*\b\s*./g;
	let definedVars: RegExpExecArray | null;
	while (definedVars = definedVarPattern.exec(text)) {
		let variable = definedVars[2];
		let isFunc = definedVars[0].endsWith("(");
		let startIndex = definedVars.index + definedVars[1].length + 1;
		if (isFunc) {
			if (methods.get(variable)) {
				methods.get(variable)!.occurrences++;
				methods.get(variable)!.indices.push(startIndex);
			} else {
				let signature = new MethodSignature(1, startIndex);
				methods.set(variable, signature);
			}
		} else {
			if (variables.get(variable)) {
				variables.get(variable)!.occurrences++;
				variables.get(variable)!.indices.push(startIndex);
			} else {
				let attrs = new IdentAttributes(isFunc, 1, startIndex);
				variables.set(variable, attrs);
			}
		}
	}
}

enum ScopeType {
	FUNC_SCOPE = 0,
	WHILE_SCOPE = 1,
	CODE_BLOCK = 2,
	IF_SCOPE = 3,
	NONE = -1
};

let functionKeywords: string[] = [
	"is", "end"
];
let whileKeywords: string[] = [
	"while", "do", "done"
];
let codeBlockKeywords: string[] = [
	"begin", "end"
];
let ifKeywords: string[] = [
	"if", "then", "else", "fi"
];

function getWordScopeType(word: string): ScopeType {
	if (functionKeywords.includes(word)) {
		return ScopeType.FUNC_SCOPE;
	}
	if (whileKeywords.includes(word)) {
		return ScopeType.WHILE_SCOPE;
	}
	if (codeBlockKeywords.includes(word)) {
		return ScopeType.CODE_BLOCK;
	}
	if (ifKeywords.includes(word)) {
		return ScopeType.IF_SCOPE;
	}
	return -1;
}

function getWordIndex(text: string, word: string, occurrences: number): number {
	let pattern: RegExp = new RegExp("\\b" + word + "\\b", "g");
		let matched: RegExpExecArray | null;
		let i = 1;
		while (matched = pattern.exec(text)) {
			if (i == occurrences) {
				return matched.index;
			}
			i++;
		}
		return -1;
}


function validateScopes(textDocument: TextDocument, text: string): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];
	let words = text.split(/\s+/g);
	let db: DiagnosticBuilder = new DiagnosticBuilder(textDocument, hasDiagnosticRelatedInformationCapability);
	let initializer: string[] = ["is", "while", "begin", "if"];
	let stack: string[][] = [];
	let counter: number[] = [0, 0, 0, 0];
	let scopeTypeStack: number[] = [];
	let noneInitializer = difference(functionKeywords.concat(whileKeywords, codeBlockKeywords, ifKeywords), initializer);

	words.forEach(word => {
		let reduced = false;
		let wordScopeType = getWordScopeType(word);
		let top = stack[stack.length - 1];

		if (noneInitializer.includes(word) && stack.length == 0) {
			let startIndex = getWordIndex(text, word, counter[wordScopeType] + 1);
			let diagnostic = logError(word, startIndex, initializer[wordScopeType]);
			diagnostics.push(diagnostic);
			return diagnostics;	
		}

		switch (wordScopeType) {
			case ScopeType.FUNC_SCOPE:
				switch (word) {
					case "is":
						counter[ScopeType.FUNC_SCOPE]++;
						scopeTypeStack.push(ScopeType.FUNC_SCOPE);
						stack.push([...functionKeywords]);
						stack[stack.length - 1].shift();
						break;
					case "end":
						if (top[0] === "end") { 
							reduced = true;
							stack.pop();
							scopeTypeStack.pop();
						}
						break;
				}
				break;
			case ScopeType.WHILE_SCOPE:
				switch (word) {
					case "while":
						counter[ScopeType.WHILE_SCOPE]++;
						scopeTypeStack.push(ScopeType.WHILE_SCOPE);
						stack.push([...whileKeywords])
						stack[stack.length - 1].shift();
						break;
					case "do":
						if (top[0] === "do") {
							reduced = true;
							top.shift();
						}
						break;
					case "done":
						if (top[0] === "done") {
							reduced = true;
							stack.pop();
							scopeTypeStack.pop();
						}
						break;
				}
				break;
			case ScopeType.CODE_BLOCK:
				switch (word) {
					case "begin":
						counter[ScopeType.CODE_BLOCK]++;
						scopeTypeStack.push(ScopeType.CODE_BLOCK);
						stack.push([...codeBlockKeywords]);
						stack[stack.length - 1].shift();
						break;
					case "end":
						if (top[0] === "end") {
							reduced = true;
							stack.pop();
							scopeTypeStack.pop();
						}
						break;
				}
				break;
			case ScopeType.IF_SCOPE:
				switch (word) {
					case "if":
						counter[ScopeType.IF_SCOPE]++;
						scopeTypeStack.push(ScopeType.IF_SCOPE);
						stack.push([...ifKeywords]);
						stack[stack.length - 1].shift();
						break;
					case "then":
						if (top[0] === "then") {
							reduced = true;
							top.shift();
						}
						break;
					case "else":
						if (top[0] === "else") {
							reduced = true;
							top.shift();
						}
						break;
					case "fi":
						if (top[0] === "fi") {
							reduced = true;
							stack.pop();
							scopeTypeStack.pop();
						}
						break;
				}
				break;
		}
		if (noneInitializer.includes(word) && !reduced) {
			let startIndex = getWordIndex(text, word, counter[wordScopeType] + 1);
			let diagnostic = logError(word, startIndex, initializer[wordScopeType]);
			diagnostics.push(diagnostic);
			return diagnostics;
		}
	});
	if (stack.length != 0) {
		let top = scopeTypeStack[scopeTypeStack.length - 1];
		let startIndex = getWordIndex(text, initializer[top], counter[top]);
		let diagnostic = logError(initializer[top], startIndex, stack[stack.length - 1][0]);
		diagnostics.push(diagnostic);
		return diagnostics;
	}
	return diagnostics;
	
	function logError(ident: string, startIndex: number, info: string): Diagnostic {
		db.setIdent(ident)
			.setStartIndex(startIndex)
			.setAdditionalInfo(info)
			.setSeverity(DiagnosticSeverity.Error);
		return db.getDiagnostic(DiagnosticType.UNMATCHED_BLOCK);
	}
}


function validateUnusedAndInvalidIdentifiers(isFunc: boolean,
																						 textDocument: TextDocument, 
																						 text: string): Diagnostic[] 
{
	let diagnostics: Diagnostic[] = [];
	let db = new DiagnosticBuilder(textDocument, hasDiagnosticRelatedInformationCapability);

	let map = isFunc ? methods : variables;
	db.setIsFunc(isFunc);
	// Find defined variables that are never used
	for (let [ident, attrs] of map) {
		db.setIdent(ident);
		if (!ident) { continue; }
		if (attrs.occurrences > 1) {
			// Same variable defined multiple times
			for (var i = 0; i < attrs.occurrences; i++) {
				let startIndex = attrs.indices[i];
				db.setStartIndex(startIndex);
				db.setSeverity(DiagnosticSeverity.Error);
				let diagnostic = db.getDiagnostic(DiagnosticType.MULTIPLE_DEFINITION);
				diagnostics.push(diagnostic);
			}
		}
		let startIndex = attrs.indices[0];
		db.setStartIndex(startIndex);
		if (waccKeywords.includes(ident) || waccTypes.includes(ident)) {
			db.setSeverity(DiagnosticSeverity.Error);
			let diagnostic = db.getDiagnostic(DiagnosticType.KEYWORD_CLASH);
			diagnostics.push(diagnostic);
		}
		if (!/[_a-zA-Z]/g.test(ident.substring(0, 1))) {
			// Invalid identifier name
			db.setSeverity(DiagnosticSeverity.Error);
			let diagnostic = db.getDiagnostic(DiagnosticType.INVALID_IDENTIFIER);
			diagnostics.push(diagnostic);
		}
		let regexUnusedIdent = isFunc ? new RegExp("\\b" + ident + "\\s*\\(", "g") : 
																		new RegExp("\\b" + ident + "\\b\\s*[^\\(]", "g");
		if ((text.match(regexUnusedIdent) || []).length == 1) {
			// Unused identifier
			db.setSeverity(DiagnosticSeverity.Warning);
			let diagnostic = db.getDiagnostic(DiagnosticType.UNUSED_IDENTIFIER);
			diagnostics.push(diagnostic);
		}
	}
	return diagnostics;
}

function validateUndefinedVariables(textDocument: TextDocument, 
																		text: string): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];
	let identPattern = /(\w+)(.)/gs;
	let token: RegExpExecArray | null;
	let db = new DiagnosticBuilder(textDocument, hasDiagnosticRelatedInformationCapability);
	let types = difference(waccTypes, ["pair"]);
	while (token = identPattern.exec(text)) {
		let isValidType = (types.includes(token[1]) ||
											 (token[1] === "pair" && token[2] === "("));
		if ((!waccKeywords.includes(token[1])) && (!isValidType) &&
				(!variables.get(token[1])) &&
				(!methods.get(token[1])) &&
				(isNaN(Number(token[1]))) && (!(token[0] === "end"))) {
			db.setIdent(token[1]);
			db.setIsFunc(token[0].endsWith("("));
			db.setSeverity(DiagnosticSeverity.Error);
			db.setStartIndex(token.index);
			let diagnostic = db.getDiagnostic(DiagnosticType.UNDEFINED_IDENTIFIER);
			diagnostics.push(diagnostic);
		}
	}
	return diagnostics;
}

function validateIdentifiers(textDocument: TextDocument,
													 text: string): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];
	diagnostics = diagnostics.concat(validateUnusedAndInvalidIdentifiers(true, textDocument, text));
	diagnostics = diagnostics.concat(validateUnusedAndInvalidIdentifiers(false, textDocument, text));
	diagnostics = diagnostics.concat(validateUndefinedVariables(textDocument, text));
	return diagnostics;
}

function getTextToDiagnose(textDocument: TextDocument): string {
	let originalText: string = textDocument.getText();
	let patternToRemove = /(#.*|\".*\"|\'.*\')/g;
	let substring: RegExpExecArray | null;
	var text = originalText;
	while (substring = patternToRemove.exec(originalText)) {
		let placeholder = new Array(substring[0].length + 1).join("*");
		text = text.replace(substring[0], placeholder);
	}
	return text;
}

function difference(a1: string[], a2: string[]): string[] {
	return a1.filter(function (x) { return !a2.includes(x) });
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);
	methods.clear();
	variables.clear();
	// The validator creates diagnostics for all uppercase words length 2 and more
	let problems = 0;
	let diagnostics: Diagnostic[] = [];
	let text = getTextToDiagnose(textDocument);
	diagnostics = diagnostics.concat(validateScopes(textDocument, text));
  getDefinedIdents(text);
	diagnostics = diagnostics.concat(validateIdentifiers(textDocument, text));
	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		let keywordsInSnippets: string[] = [
			"begin", "while", "if"
		];

		let keywords = difference(waccKeywords.concat(waccTypes), keywordsInSnippets);
		let counter = 0;
		let keywordsItems: CompletionItem[] = keywords.map(keyword => {
			return {
				label: keyword,
				kind: CompletionItemKind.Keyword,
				data: ++counter
			}
		});
		let idents = Array.from(methods.keys()).concat(Array.from(variables.keys()))
		let identItems: CompletionItem[] = idents.map(ident => {
			return {
				label: ident,
				kind: CompletionItemKind.Variable,
				data: ++counter
			}
		});
		return keywordsItems.concat(identItems);
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.textDocument.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.textDocument.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
