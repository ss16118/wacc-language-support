const util = require('util');
const exec = util.promisify(require('child_process').exec);

export class DocumentExecutor {
	public async update() {
		try {
			const {stdout, _} = await exec('java -jar "%USERPROFILE%/Desktop/wacc-language-support/utils/wacc-1.0-SNAPSHOT.jar" "%USERPROFILE%/Desktop/wacc-language-support/utils/temp.wacc"');
			if (!(stdout === "")) {
				return stdout;
			} else {
				return "";
			}
		} catch (ex) {
			console.log(ex);
		}
	}
}