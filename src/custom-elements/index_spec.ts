import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { IOptions } from './options.interface';

const collectionPath = path.join(__dirname, '../collection.json');

describe('custom-elements', () => {
  it('works', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner
      .runSchematicAsync<IOptions>('custom-elements', { manifest: 'test-manifest', importPath: '@tylertech/forge', exclude: '', outDir: '', outDirExcludePrefix: '' }, Tree.empty())
      .toPromise();

    expect(tree.files).toEqual(['/date-picker/date-picker.component.ts']);
  });
});
