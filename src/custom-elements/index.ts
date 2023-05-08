import {
	apply,
	chain,
	MergeStrategy,
	mergeWith,
	move,
	Rule,
	SchematicContext,
	Source,
	strings,
	template,
	Tree,
	url
} from '@angular-devkit/schematics';
import * as schema from 'custom-elements-manifest/schema';
import { readFileSync } from 'fs';
import { ICliOptions, IOptions } from './options.interface';
import { getOutDir, isCustomElement, moduleExists, TaggedCustomElement, toBaseName, toJsDocBlock } from './utils';

export function customElements(inputOptions: IOptions): Rule {
	return (tree: Tree, context: SchematicContext) => {

		// If config file is passed, read file and convert to same options as CLI.
		const options: ICliOptions = 'config' in inputOptions && inputOptions.config
			? JSON.parse(readFileSync(inputOptions.config, { encoding: 'utf-8' }))
			: inputOptions;

		const manifest = JSON.parse(readFileSync(options.manifest, { encoding: 'utf-8' })) as schema.Package;
		let customElementsWithTags = manifest.modules.reduce((acc, module) => {
			acc.push(...(module.declarations?.filter(
				// Potentially should (also?) check for CustomElementDefinition export which requires `name` property.
				(dec): dec is TaggedCustomElement => isCustomElement(dec, manifest.modules) && 'tagName' in dec) ?? [])
			);
			return acc;
		}, [] as TaggedCustomElement[]);
		context.logger.info(`Found ${customElementsWithTags.length} custom element(s) with tag name specified in ${manifest.modules.length} module(s).`);

		const excludedTagNames = options.exclude?.split(',').map(e => e.trim()).filter(e => e !== '');
		if (excludedTagNames?.length > 0) {
			customElementsWithTags = customElementsWithTags.filter(ce => !excludedTagNames.includes(ce.tagName));
			context.logger.info(`Excluding ${excludedTagNames.length} elements, ${customElementsWithTags.length} remain.`);
		}

		context.logger.debug(`Elements to generate components for: ${customElementsWithTags.map(x => x.tagName).toString()}`);

		// TODO: Don't generate @Input for @FoundationProperty({set: false}) (not indicated by metadata)
		const sources = customElementsWithTags.map(element => {
			const dependencies = options.standalone
				? options.componentDependencies?.[element.tagName]
					?.map(tag => customElementsWithTags.find(el => el.tagName === tag))
					.filter(dep => !!dep)
					.map(dep => {
						const dashifiedName = strings.dasherize(toBaseName(dep!.name));
						return { ...dep, relativePath: `..${getOutDir(options, dep!.tagName, {relative: true})}/${dashifiedName}.component` };
					})
				: undefined;
			return apply(url('./files/component'), [
				template({
					...element,
					baseName: toBaseName(element.name),
					standalone: options.standalone,
					dependencies: dependencies ?? [],
					importPath: options.importPath,
					useDefineFunction: options.useDefineFunction,
					methods: element.members?.filter(x => x.kind === 'method' && x.privacy === 'public') ?? [],
					properties: element.members?.filter(x => x.kind === 'field' && x.privacy === 'public') ?? [],
					attributes: element.attributes ?? [],
					events: element.events ?? [],
					...strings,
					toJsDocBlock
				}),
				move(getOutDir(options, element.tagName))
			])
		});

		let moduleSources: Source[] = [];
		if (!options.standalone) {
			const elementMap = customElementsWithTags.reduce(
				(agg, element) => {
					const hasExistingModule = moduleExists(tree, getOutDir(options, element.tagName));
					const baseName = toBaseName(element.name);
					const moduleName = `${options.modulePrefix}${baseName}${hasExistingModule ? 'Proxy' : ''}Module`;
					const relativePath = `..${getOutDir(options, element.tagName, {relative: true})}/${strings.dasherize(baseName)}${hasExistingModule ? '-proxy' : ''}.module`;
					agg[element.tagName] = { hasExistingModule, moduleName, relativePath };
					return agg;
				},
				{} as Record<string, { hasExistingModule: boolean; moduleName: string; relativePath: string; }>
			);

			context.logger.info(`Generating modules for ${customElementsWithTags.length} components.`);

			moduleSources = customElementsWithTags.map(element => apply(url('./files/module '), [
				template({
					...element,
					...strings,
					baseName: toBaseName(element.name),
					moduleName: elementMap[element.tagName].moduleName,
					dependencies: options.componentDependencies?.[element.tagName]?.map(tag => elementMap[tag]) ?? [],
					importPath: options.importPath,
					useDefineFunction: options.useDefineFunction
				}),
				(tree: Tree): Tree => {
					const moduleInfo = elementMap[element.tagName];
					if (moduleInfo.hasExistingModule) {
						const fileName = strings.dasherize(toBaseName(element.name));
						context.logger.debug(`Generating: ${fileName}-proxy.module.ts because a non-generated ${fileName}.module.ts already exists.`);
						tree.rename(`${fileName}.module.ts`, `${fileName}-proxy.module.ts`)
					}
					return tree;
				},
				move(getOutDir(options, element.tagName)),
			]));
		} else {
			context.logger.info(`Skipping modules because generated components are standalone.`);
		}

		// TODO (3.0): Update existing non-generated modules to ensure proxy module in declarations and exports.

		// TODO: Either generate index.ts and export component/module, or update existing

		return chain([
			chain(sources.map(source => mergeWith(source, MergeStrategy.Overwrite))),
			chain(moduleSources.map(source => mergeWith(source, MergeStrategy.Overwrite))),
		] as Rule[]);
	};
}
