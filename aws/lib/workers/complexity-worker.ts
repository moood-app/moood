import { AbstractWorker } from './worker-registry';

export class ComplexityWorker extends AbstractWorker {
  readonly name = 'complexity';
  buildArgs = {};
  environment = {};
}
