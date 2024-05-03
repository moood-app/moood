import * as inflector from 'inflected';

export interface WorkerInterface {
  readonly name: string;
  buildArgs?: {
    [key: string]: string;
  };
  environment: {
    [key: string]: string;
  };

  get capitalizedName(): string;
}

export abstract class AbstractWorker implements WorkerInterface {
  abstract readonly name: string;
  abstract buildArgs?: {
    [key: string]: string;
  };
  abstract environment: {
    [key: string]: string;
  };

  get capitalizedName(): string {
    return inflector.capitalize(this.name);
  }
}

export class WorkerRegistry {
  workers: WorkerInterface[] = [];

  public get all(): WorkerInterface[] {
    return this.workers;
  }

  register(worker: WorkerInterface): WorkerRegistry {
    this.workers.push(worker);
    return this;
  }
}
