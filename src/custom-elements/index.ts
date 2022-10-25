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
import { getOutDir, isCustomElement, moduleExists, TaggedCustomElement, toFileName, toJsDocBlock } from './utils';

export function customElements(options: IOptions): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
	const manifest = JSON.parse(readFileSync(options.manifest, {encoding: 'utf-8'})) as schema.Package;
	let customElementsWithTags = manifest.modules.reduce((acc, module) => {
		acc.push(...(module.declarations?.filter(
			(dec): dec is TaggedCustomElement => isCustomElement(dec, manifest.modules) && 'tagName' in dec) ?? [])
		);
		return acc;
	}, [] as TaggedCustomElement[]);
	console.log(`Found ${customElementsWithTags.length} custom element(s) with tag name specified in ${manifest.modules.length} module(s).`);
	
	const excludedTagNames = options.exclude?.split(',').map(e => e.trim()).filter(e => e !== '');
	if (excludedTagNames?.length > 0) {
		customElementsWithTags = customElementsWithTags.filter(ce => !excludedTagNames.includes(ce.tagName));
		console.log(`Excluding ${excludedTagNames.length} elements, ${customElementsWithTags.length} remain.`);
	}

	console.dir(customElementsWithTags.map(x => x.name));

	const sources = customElementsWithTags.map(element => apply(url('./files/component'), [
		template({
			...element,
			fileName: toFileName(element.name),
			importPath: options.importPath,
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
			(moduleExists(_tree, getOutDir(options, element.tagName))
				? agg.withModules
				: agg.withoutModules).push(element);
		return agg;
	  	},
		{ withModules: [] as TaggedCustomElement[], withoutModules: [] as TaggedCustomElement[] }
	);
	  console.log(`Generating modules for ${elementMap.withoutModules.length} components.`);
	  const moduleSources = elementMap.withoutModules.map(element => apply(url('./files/module '), [
		template({
			...element,
			...strings,
			fileName: toFileName(element.name)
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
