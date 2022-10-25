
import { Tree } from '@angular-devkit/schematics';
import { findModule } from '@schematics/angular/utility/find-module';
import * as schema from 'custom-elements-manifest/schema';
import { IOptions } from './options.interface';

export type CustomElementClassDeclaration = schema.CustomElement & schema.CustomElementDeclaration;
export type TaggedCustomElement = CustomElementClassDeclaration & { tagName: string };

/**
 * Returns a declaration matching the provided selector.
 * @param modules The array of modules from the manifest.
 * @param selector A selector to use to locate a declaration within any of the modules.
 * @returns The matching declaration if found, or undefined.
 */
export function getDeclaration(modules: schema.Module[], selector: (x: schema.Declaration) => boolean): schema.Declaration | undefined {
	const module = modules.find(module => module.declarations?.some(selector));
	return module?.declarations?.find(selector);
}

/**
 * Determine if a declared export of a module represents a custom element, accounting for inheritance.
 * @param declaration A declared export from the manifest.
 * @param modules The array of modules from the manifest.
 * @returns True if the declaration represents a custom element, false otherwise.
 */
export function isCustomElement(declaration: schema.Declaration | undefined, modules: schema.Module[]): declaration is CustomElementClassDeclaration {
	if (!declaration) return false;
	if ('customElement' in declaration && declaration.customElement) return true;
	if ('superclass' in declaration && declaration.superclass) {
		return isCustomElement(getDeclaration(modules, d => d.name === declaration.superclass?.name), modules);
	}
	return false;
}

/**
 * Processes schematic configuration to return the appropriate directory to output a generated custom element proxy.
 * @param options The schematic options
 * @param tagName The tag name of the custom element.
 * @returns The output directory to use for the custom element proxy.
 */
export function getOutDir(options: IOptions, tagName: string): string {
	return `${
		options.outDir ?? '.'
	}/${
		options.outDirExcludePrefix
			? tagName.replace(new RegExp(`^${options.outDirExcludePrefix}`), '')
			: tagName
	}`;
}

/**
 * Strips off the 'Component' suffix from a class name.
 * @param className A component class name.
 * @returns The component name without the 'Component' suffix.
 */
export function toFileName(className: string): string {
	return className.replace(/Component$/, '');
}

/**
 * Checks if a module exists in the target directory.
 * @param tree The filesystem tree context the schematic is being run in.
 * @param targetDir The directory to look in.
 * @returns True if a `.module.ts` file exists in the target directory, false otherwise
 */
export function moduleExists(tree: Tree, targetDir: string): boolean {
	try {
		// TODO: Return false if foundModule is generated (could be determined by header comment) to regenerate it
		// Ensure result is in targetDir and not a parent directory.
		const module = findModule(tree, targetDir);
		console.log(`${module} vs ${targetDir}`);
		return module.startsWith(targetDir.startsWith('/') ? targetDir : `/${targetDir}`);
	} catch {
		return false;
	}
}

/**
 * Converts a description string into a JSDoc block comment.
 * @param description The description string, which can be multi-line.
 * @param indentLevel Optional level of indentation, defaults to zero.
 * @return The description formatted as a JSDoc block comment.
 */
export function toJsDocBlock(description: string, indentLevel: number = 0): string {
	const indent = '\t'.repeat(indentLevel);
	if (!description.includes('\n')) {
		return `${indent}/** ${description} */`;
	}

	const body = description.split('\n').map(line => `${indent} * ${line}`).join('\n');
	return `${indent}/**\n${body}\n${indent} */`;
}
