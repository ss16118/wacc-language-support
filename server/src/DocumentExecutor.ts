import { extensionPath } from './server';

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
export class DocumentExecutor {
	/**
	 * Executes the code in the document and returns the output message
	 * if successful.
	 */
	public async update() {
		let result: [string, string] = ["", ""];
		try {
			const {stdout, stderr} = await exec(`java -jar "${extensionPath}/utils/wacc-1.0-SNAPSHOT.jar" "${extensionPath}/utils/temp.wacc"`);
			result[0] = stdout;
			result[1] = stderr;
			return result;
		} catch (ex) {
			console.log(ex);
		}
	}


	private extractPureOutput(emulatorOutput: string): string {
		let pureOutput = "";
		let pureInputPattern = /Emulation Output:\s([\s\S]*)\s-{63}/g;
		let matched: RegExpExecArray | null;
		if (matched = pureInputPattern.exec(emulatorOutput)) {
			pureOutput += matched[1] + "\n";
		}
		let exitCodePattern = /The exit code is: \d+/g;
		let matchedExitCode: RegExpExecArray | null;
		if (matchedExitCode = exitCodePattern.exec(emulatorOutput)) {
			pureOutput += matchedExitCode
		}
		return pureOutput;
	}

	public async getExecutionOutput(docContent: string, input: string) {
		try {
			fs.writeFile(`${extensionPath}/utils/temp.wacc`, docContent, (error: Error) => {	
				if (error) {
					console.log(error);
				}
			});
			const { _, stderr } = await exec(`java -jar "${extensionPath}/utils/wacc-1.0-SNAPSHOT.jar" -x "${extensionPath}/utils/temp.wacc" "${extensionPath}/utils/temp.s"`);
			if (!(stderr === "")) {
				console.log("Compilation failed due to errors. Please fix all syntax and semantics errors before executing!");
			} else {
				const {stdout, stderr} = await exec(`ruby "${extensionPath}/utils/refEmulate" "${extensionPath}/utils/temp.s" "${input}"`);
				if (!(stderr === "")) {
					console.log("An error occurred: " + stderr);
				} else {
					console.log("Execution Result:");
					console.log(this.extractPureOutput(stdout) + "\n");
				}
			}
		} catch (ex) {
			console.log(ex);
		}
	}
}