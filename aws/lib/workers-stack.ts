import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentAwareNestedStackProps, VersionAwareNestedStackProps, WorkerRegistryAwareNestedStackProps } from './moood-stack';
import { WorkerStack } from './workers/worker-stack';

interface WorkersStackProps
  extends cdk.NestedStackProps,
    EnvironmentAwareNestedStackProps,
    WorkerRegistryAwareNestedStackProps,
    VersionAwareNestedStackProps {}

export class WorkersStack extends cdk.NestedStack {
  constructor(scope: Construct, props: WorkersStackProps) {
    super(scope, 'workers-stack', props);

    const { registry } = props;

    registry.all.forEach((worker) => {
      new WorkerStack(this, {
        worker,
        ...props,
      });
    });
  }
}
