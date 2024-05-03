import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { ApiStack } from './api-stack';
import { OrchestrationStack } from './orchestration-stack';
import { StorageStack } from './storage-stack';
import { WorkersStack } from './workers-stack';
import { AsentWorker } from './workers/asent-worker';
import { ComplexityWorker } from './workers/complexity-worker';
import { WorkerRegistry } from './workers/worker-registry';

export interface VpcAwareNestedStackProps {
  readonly vpc: ec2.Vpc;
}

export interface EnvironmentAwareNestedStackProps {
  readonly env: cdk.Environment;
}

export interface WorkerRegistryAwareNestedStackProps {
  readonly registry: WorkerRegistry;
}

export interface VersionAwareNestedStackProps {
  readonly version: string;
}

export class MooodStack extends cdk.Stack {
  constructor(scope: Construct, props: cdk.StackProps) {
    super(scope, 'moood-stack', props);

    const { env } = props;

    const version = process.env.VERSION!;

    const vpc = new ec2.Vpc(this, 'MooodVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 28, // 16 subnets, 14 addresses
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 28, // 16 subnets, 14 addresses
          name: 'isolated-subnet',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const registry = new WorkerRegistry();
    registry.register(new AsentWorker()).register(new ComplexityWorker());

    const storageStack = new StorageStack(this, { vpc });

    new ApiStack(this, {}).addDependency(storageStack);

    const workersStack = new WorkersStack(this, { env: env!, registry, version });

    const orchestrationStack = new OrchestrationStack(this, { registry });
    orchestrationStack.addDependency(storageStack);
    orchestrationStack.addDependency(workersStack);
  }
}
