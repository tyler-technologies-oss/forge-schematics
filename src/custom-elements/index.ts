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
import { CustomElementClassDeclaration, getOutDir, isCustomElement, moduleExists, TaggedCustomElement, toFileName, toJsDocBlock } from './utils';

export function customElements(options: IOptions): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
	const manifest = JSON.parse(readFileSync(options.manifest, {encoding: 'utf-8'})) as schema.Package;
	console.log(`Found ${manifest.modules.length} modules.`);

	const customElementDecs = manifest.modules.reduce((acc, module) => {
		// also need to know if any base class isCustomElement
		acc.push(...(module.declarations?.filter(
			(dec): dec is CustomElementClassDeclaration => isCustomElement(dec, manifest.modules)) ?? [])
		);
		return acc;
	}, [] as CustomElementClassDeclaration[]);
	console.log(`Found ${customElementDecs.length} custom elements:`);
	
	let customElementsWithTags = customElementDecs.filter((x): x is TaggedCustomElement => 'tagName' in x);
	console.log(`${customElementsWithTags.length} out of ${customElementDecs.length} custom elements have tag names specified:`);

	const excludedTagNames = options.exclude?.split(',').map(e => e.trim());
	if (excludedTagNames?.length > 0) {
		console.log(`Excluding ${excludedTagNames.length} elements.`);
		customElementsWithTags = customElementsWithTags.filter(ce => !excludedTagNames.includes(ce.tagName));
		console.log(`${customElementsWithTags.length} elements remain.`);
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
	  console.log(`${elementMap.withoutModules.length} elements do not have associated modules.`);
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
		chain(moduleSources.map(source => mergeWith(source, MergeStrategy.Overwrite))),
	  ] as Rule[]);
  };
}
