export interface IConfigOptions {
	config?: string;
}

export interface ICliOptions {
	componentDependencies?: Record<string, string[]>;
	manifest: string;
	importPath: string;
	outDir: string;
	outDirExcludePrefix: string;
	exclude: string;
	modulePrefix: string;
	useDefineFunction: boolean;
	standalone: boolean;
}
export type IOptions = IConfigOptions | ICliOptions;