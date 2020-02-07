export class IdentAttributes {
	public isFunc: boolean;
	public occurrences: number;
	public indices: number[] = [];
	constructor(isFunc: boolean, occurrences: number, index: number) {
		this.isFunc = isFunc
		this.occurrences = occurrences;
		this.indices.push(index);
	}
}

export class MethodSignature {
	public occurrences: number;
	public parameters: string[] = [];
	public indices: number[] = [];
	constructor(occurrences: number, index: number) {
		this.occurrences = occurrences;
		this.indices.push(index);
	}
}
