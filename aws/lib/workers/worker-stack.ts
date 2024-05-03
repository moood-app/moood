import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentAwareNestedStackProps, VersionAwareNestedStackProps } from '../moood-stack';
import { WorkerEcrStack } from './worker-ecr-stack';
import { WorkerLambdaStack } from './worker-lambda-stack';
import { WorkerInterface } from './worker-registry';

interface WorkerStackProps extends cdk.NestedStackProps, EnvironmentAwareNestedStackProps, VersionAwareNestedStackProps {
  worker: WorkerInterface;
}

export class WorkerStack extends cdk.NestedStack {
  constructor(scope: Construct, props: WorkerStackProps) {
    const { worker, version } = props;

    super(scope, `worker-${worker.name}-stack`, props);

    const workerEcrStack = new WorkerEcrStack(scope, {
      ...props,
      worker,
      version,
    });

    const workerLambdaStack = new WorkerLambdaStack(scope, {
      ...props,
      worker,
      version,
    });

    workerLambdaStack.addDependency(workerEcrStack);
  }
}
