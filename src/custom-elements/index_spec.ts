import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { IOptions } from './options.interface';

const collectionPath = path.join(__dirname, '../collection.json');

describe('custom-elements', () => {
  it('should generate a component and module for each element in a folder matching the tag name', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner
      .runSchematicAsync<IOptions>('custom-elements', { 
        manifest: 'src/custom-elements/test-manifest.json',
        importPath: '@tylertech/forge',
        exclude: '',
        outDir: '',
        outDirExcludePrefix: '',
        modulePrefix: ''
      }, Tree.empty())
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
      .runSchematicAsync<IOptions>('custom-elements', { 
        manifest: 'src/custom-elements/test-manifest.json',
        importPath: '@tylertech/forge',
        exclude: '',
        outDir: '',
        outDirExcludePrefix: '',
        modulePrefix: ''
      }, startingTree)
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
        manifest: 'src/custom-elements/test-manifest.json',
        importPath: '@tylertech/forge',
        exclude: '',
        outDir: 'test',
        outDirExcludePrefix: '',
        modulePrefix: ''
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
        manifest: 'src/custom-elements/test-manifest.json',
        importPath: '@tylertech/forge',
        exclude: '',
        outDir: '',
        outDirExcludePrefix: 'forge-',
        modulePrefix: ''
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
        manifest: 'src/custom-elements/test-manifest.json',
        importPath: '@tylertech/forge',
        exclude: 'forge-accordion',
        outDir: '',
        outDirExcludePrefix: '',
        modulePrefix: ''
      }, Tree.empty())
      .toPromise();

    expect(tree.files).toEqual([]);
  });
});
