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

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

let waccKeywords: string[] = [
	"skip", "read", "free", "return", "exit", "print",
	"println", "if", "then", "else", "fi", "while", "is",
	"do", "done", "begin", "end", ";", "len", "chr", "ord", "call", "newpair"
];

let waccTypes: string[] = [
	"int", "char", "bool", "string", "pair"
];

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

class IdentAttributes {
	public isFunc: boolean;
	public occurrences: number;
	public indices: number[] = [];
	constructor(isFunc: boolean, occurrences: number, index: number) {
		this.isFunc = isFunc
		this.occurrences = occurrences;
		this.indices.push(index);
	}
}

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
	let definedVarPattern = /\b((?:int|bool|char|string|(?:pair\s*\(\s*\w+,\s*\w+\s*\)))\s*(?:(?:\[\])*)?)\s+(\w+)*\b\s*./g;
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


function validateUnusedAndInvalidVariables(textDocument: TextDocument, 
																					 text: string): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];
	let db = new DiagnosticBuilder(textDocument, hasDiagnosticRelatedInformationCapability);
	// Find defined variables that are never used
	variables.forEach((attrs: IdentAttributes, ident: string) => {
		db.setIdent(ident);
		db.setIsFunc(false);
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

		if (!/[_a-zA-Z]/g.test(ident.substring(0, 1))) {
			// Invalid identifier name
			let startIndex = attrs.indices[0];
			db.setStartIndex(startIndex);
			db.setSeverity(DiagnosticSeverity.Error);
			let diagnostic = db.getDiagnostic(DiagnosticType.INVALID_IDENTIFIER);
			diagnostics.push(diagnostic);
		}

		if ((text.match(new RegExp("\\b" + ident + "\\b", "g")) || []).length == 1) {
			// Unused identifier
			let startIndex = attrs.indices[0];
			db.setStartIndex(startIndex);
			db.setSeverity(DiagnosticSeverity.Warning);
			let diagnostic = db.getDiagnostic(DiagnosticType.UNUSED_IDENTIFIER);
			diagnostics.push(diagnostic);
		}
	});
	return diagnostics;
}

function validateUndefinedVariables(textDocument: TextDocument, 
																		text: string): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];
	let identPattern = /\b(\w+)\b/g;
	let token: RegExpExecArray | null;
	let db = new DiagnosticBuilder(textDocument, hasDiagnosticRelatedInformationCapability);
	while (token = identPattern.exec(text)) {
		if ((!waccKeywords.includes(token[1])) && 
				(!variables.get(token[1])) && (!methods.get(token[1])) &&
				(!waccTypes.includes(token[1])) && (isNaN(Number(token[1])))) {
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


function validatedUnusedAndInvalidMethods(textDocument: TextDocument,
																					text: string): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];
	let db = new DiagnosticBuilder(textDocument, hasDiagnosticRelatedInformationCapability);
	// Find defined variables that are never used
	methods.forEach((signature: MethodSignature, ident: string) => {
		db.setIdent(ident);
		db.setIsFunc(true);
		if (signature.occurrences > 1) {
			// Same variable defined multiple times
			for (var i = 0; i < signature.occurrences; i++) {
				let startIndex = signature.indices[i];
				db.setStartIndex(startIndex);
				db.setSeverity(DiagnosticSeverity.Error);
				let diagnostic = db.getDiagnostic(DiagnosticType.MULTIPLE_DEFINITION);
				diagnostics.push(diagnostic);
			}
		}

		if (!/[_a-zA-Z]/g.test(ident.substring(0, 1))) {
			// Invalid identifier name
			let startIndex = signature.indices[0];
			db.setStartIndex(startIndex);
			db.setSeverity(DiagnosticSeverity.Error);
			let diagnostic = db.getDiagnostic(DiagnosticType.INVALID_IDENTIFIER);
			diagnostics.push(diagnostic);
		}

		if ((text.match(new RegExp("\\b" + ident + "\\s*\\(", "g")) || []).length == 1) {
			// Unused identifier
			let startIndex = signature.indices[0];
			db.setStartIndex(startIndex);
			db.setSeverity(DiagnosticSeverity.Warning);
			let diagnostic = db.getDiagnostic(DiagnosticType.UNUSED_IDENTIFIER);
			diagnostics.push(diagnostic);
		}
	});
	return diagnostics;
}


function validateIdentifiers(textDocument: TextDocument, 
													 text: string): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];
	diagnostics = diagnostics.concat(validateUnusedAndInvalidVariables(textDocument, text));
	diagnostics = diagnostics.concat(validatedUnusedAndInvalidMethods(textDocument, text));
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

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);
	methods.clear();
	variables.clear();
	// The validator creates diagnostics for all uppercase words length 2 and more
	let problems = 0;
	let diagnostics: Diagnostic[] = [];

	let text = getTextToDiagnose(textDocument);
	getDefinedIdents(text);
	diagnostics = diagnostics.concat(validateIdentifiers(textDocument, text));
	// diagnostics = diagnostics.concat(validateUndefinedVariables(textDocument));
	
	/*
	let pattern = /(#.*|\".*\"|\'.*\')/g;
	let m: RegExpExecArray | null;
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {

		problems++;
		let diagnostic: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is all uppercase.`,
			source: 'ex'
		};
		if (hasDiagnosticRelatedInformationCapability) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Spelling matters'
				},
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Particularly for names'
				}
			];
		}
		diagnostics.push(diagnostic);
	}
	*/
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
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript',
				kind: CompletionItemKind.Text,
				data: 2
			}
		];
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
