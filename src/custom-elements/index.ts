import {
	apply,
	chain,
	MergeStrategy,
	mergeWith,
	move,
	Rule,
	SchematicContext,
	strings,
	template,
	Tree,
	url
} from '@angular-devkit/schematics';
import * as schema from 'custom-elements-manifest/schema';
import { readFileSync } from 'fs';
import { IOptions } from './options.interface';
import { getOutDir, isCustomElement, moduleExists, TaggedCustomElement, toBaseName, toJsDocBlock } from './utils';

export function customElements(options: IOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
	const manifest = JSON.parse(readFileSync(options.manifest, {encoding: 'utf-8'})) as schema.Package;
	let customElementsWithTags = manifest.modules.reduce((acc, module) => {
		acc.push(...(module.declarations?.filter(
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
	const sources = customElementsWithTags.map(element => apply(url('./files/component'), [
		template({
			...element,
			baseName: toBaseName(element.name),
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
	  ]));

	  const elementMap = customElementsWithTags.reduce(
		(agg, element) => {
			(moduleExists(tree, getOutDir(options, element.tagName))
				? agg.withModules
				: agg.withoutModules).push(element);
		return agg;
	  	},
		{ withModules: [] as TaggedCustomElement[], withoutModules: [] as TaggedCustomElement[] }
	);
	
	  if (elementMap.withModules.length > 0) {
	      context.logger.debug(`Skipping module generation for existing modules: ${elementMap.withModules.map(e => e.tagName)}`);
	  }
	  context.logger.info(`Generating modules for ${elementMap.withoutModules.length} components.`);
	  const moduleSources = elementMap.withoutModules.map(element => apply(url('./files/module '), [
		template({
			...element,
			...strings,
			baseName: toBaseName(element.name),
			modulePrefix: options.modulePrefix
		}),
		move(getOutDir(options, element.tagName))
	  ]));

	  // TODO: For existing non-generated modules, ensure proxy component in declarations and exports.

	  return chain([
		chain(sources.map(source => mergeWith(source, MergeStrategy.Overwrite))),
		// Use default strategy to error if file exists, switch to overwrite if we make change to detect non-generated modules only. 
		chain(moduleSources.map(source => mergeWith(source, MergeStrategy.Default))),
	  ] as Rule[]);
  };
}
