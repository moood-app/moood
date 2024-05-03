import { AbstractWorker } from './worker-registry';

export class AsentWorker extends AbstractWorker {
  readonly name = 'asent';
  buildArgs = {};
  environment = {};
}
