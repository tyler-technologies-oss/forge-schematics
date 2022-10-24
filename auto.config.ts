import { AutoRc } from 'auto';
import { INpmConfig } from '@auto-it/npm';

const npmOpts: INpmConfig = {
  setRcToken: false
};

export default function rc(): AutoRc {
  return {
    author: 'GitHub Actions <41898282+github-actions[bot]@users.noreply.github.com>',
    plugins: [
      ['npm', npmOpts],
      'conventional-commits',
      'released',
      'first-time-contributor'
    ]
  };
}
