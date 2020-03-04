import { extensionPath } from './server';
const util = require('util');
const exec = util.promisify(require('child_process').exec);
export class DocumentExecutor {
	/**
	 * Executes the code in the document and returns the output message
	 * if successful.
	 */
	public async update() {
		let result: [string, string] = ["", ""];
		try {
			const {stdout, stderr} = await exec(`java -jar "${extensionPath}/utils/wacc-1.0-SNAPSHOT.jar" "${extensionPath}/utils/temp.wacc"`);
			if (!(stdout === "")) {
				result[0] = stdout;
			}
			if (!(stderr === "")) {
				result[1] = stderr;
			}
			return result;
		} catch (ex) {
			console.log(ex);
		}
	}
}