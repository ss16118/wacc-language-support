import * as path from 'path';
import { workspace, ExtensionContext, extensions, commands, window, TextDocument, InputBoxOptions } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
} from 'vscode-languageclient';

let client: LanguageClient;

let currentDocument: string = "";
let inputBoxOptions: InputBoxOptions = {
	prompt: "please provide a stdin stream to use when emulating the program:Please enter input to the program",
	placeHolder: ""
}

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
	
	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		outputChannelName: "wacc-language-server",
		documentSelector: [{ scheme: 'file', language: 'wacc' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};
	// Create the language client and start the client.
	client = new LanguageClient(
		'languageServer',
		'Language Server',
		serverOptions,
		clientOptions
	);
	// Start the client. This will also launch the server
	client.start();
	client.onReady().then(() => {
		client.sendRequest("custom/extensionPath", extensions.getExtension("yiningshen.wacc-language-support").extensionPath);
	});
	
	// Register commands
	context.subscriptions.push(commands.registerCommand("execute-wacc", 
		async () => {
			client.sendRequest("custom/getDoc", currentDocument);
			await window.showInputBox(inputBoxOptions).then( input => {
					client.sendRequest("custom/execute", input);
				}
			);
		}
	));
}

window.onDidChangeActiveTextEditor((e) => {
	currentDocument = e.document.getText();
});

workspace.onDidChangeTextDocument((e) => {
	if (!(e.document.fileName.startsWith("extension-output"))) {
		 currentDocument = e.document.getText();
	}
});

workspace.onDidOpenTextDocument((e) => {
	currentDocument = e.getText();
});

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
