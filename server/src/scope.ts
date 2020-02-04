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

export class Scope {
	public keyword: string;
	public index: number;
	public variables: Map<string, IdentAttributes>;
	constructor(keyword: string, index: number) {
		this.keyword = keyword;
		this.index = index;
		this.variables = new Map();
	}
}
