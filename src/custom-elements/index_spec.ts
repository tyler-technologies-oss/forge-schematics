import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { IOptions } from './options.interface';

const collectionPath = path.join(__dirname, '../collection.json');

function defaultOptions(): IOptions {
  return { 
    manifest: 'src/custom-elements/test-manifest.json',
    importPath: '@tylertech/forge',
    exclude: '',
    outDir: '',
    outDirExcludePrefix: '',
    modulePrefix: '',
    useDefineFunction: false
  };
}

describe('custom-elements', () => {
  it('should generate a component and module for each element in a folder matching the tag name', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner
      .runSchematicAsync<IOptions>('custom-elements', defaultOptions(), Tree.empty())
      .toPromise();

    expect(tree.files).toEqual([
      '/forge-accordion/accordion.component.ts',
      '/forge-accordion/accordion.module.ts'
    ]);
  });

  it('should skip generating a module if one already exists in the target directory', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const startingTree = Tree.empty();
    startingTree.create('forge-accordion/accordion.module.ts', 'test');
    const tree = await runner
      .runSchematicAsync<IOptions>('custom-elements', defaultOptions(), startingTree)
      .toPromise();

    expect(tree.files).toEqual(jasmine.arrayContaining([
      '/forge-accordion/accordion.component.ts',
      '/forge-accordion/accordion.module.ts'
    ]));
    expect(tree.get('forge-accordion/accordion.module.ts')?.content.toString()).toEqual('test');
  });

  it('should generate the folders in the outDir if specified', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner
      .runSchematicAsync<IOptions>('custom-elements', { 
        ...defaultOptions(),
        outDir: 'test'
      }, Tree.empty())
      .toPromise();

    expect(tree.files).toEqual([
      '/test/forge-accordion/accordion.component.ts',
      '/test/forge-accordion/accordion.module.ts'
    ]);
  });

  it('should omit the forge prefix from the folder if outDirExcludePrefix is specified', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner
      .runSchematicAsync<IOptions>('custom-elements', { 
        ...defaultOptions(),
        outDirExcludePrefix: 'forge-',
      }, Tree.empty())
      .toPromise();

    expect(tree.files).toEqual([
      '/accordion/accordion.component.ts',
      '/accordion/accordion.module.ts'
    ]);
  });

  it('should generate exclude a component by tag name', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner
      .runSchematicAsync<IOptions>('custom-elements', { 
        ...defaultOptions(),
        exclude: 'forge-accordion'
      }, Tree.empty())
      .toPromise();

    expect(tree.files).toEqual([]);
  });

  it('should use the built-in customElements.define function if useDefineFunction is false', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner
      .runSchematicAsync<IOptions>('custom-elements', { 
        ...defaultOptions(),
        useDefineFunction: false
      }, Tree.empty())
      .toPromise();

      expect(tree.readContent(tree.files[0])).toContain(`if (!window.customElements.get('forge-accordion')) {`);
      expect(tree.readContent(tree.files[0])).toContain(`window.customElements.define('forge-accordion', AccordionComponentCustomElement);`);
      expect(tree.readContent(tree.files[1])).toContain(`import { AccordionComponent as AccordionComponentCustomElement } from '@tylertech/forge';`);
      expect(tree.readContent(tree.files[1])).toContain(`if (!window.customElements.get('forge-accordion')) {`);
      expect(tree.readContent(tree.files[1])).toContain(`window.customElements.define('forge-accordion', AccordionComponentCustomElement);`);
  });

  it('should use the library define function if useDefineFunction is true', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner
      .runSchematicAsync<IOptions>('custom-elements', { 
        ...defaultOptions(),
        useDefineFunction: true
      }, Tree.empty())
      .toPromise();

      expect(tree.readContent(tree.files[0])).toContain(`, defineAccordionComponent } from '@tylertech/forge';`);
      expect(tree.readContent(tree.files[0])).toContain(`defineAccordionComponent()`);
      expect(tree.readContent(tree.files[1])).toContain(`import { defineAccordionComponent } from '@tylertech/forge';`);
      expect(tree.readContent(tree.files[1])).toContain(`defineAccordionComponent()`);
  });
});
