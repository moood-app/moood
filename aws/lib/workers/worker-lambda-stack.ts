import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { EnvironmentAwareNestedStackProps, VersionAwareNestedStackProps } from '../moood-stack';
import { WorkerEcrStack } from './worker-ecr-stack';
import { WorkerInterface } from './worker-registry';

interface WorkerLambdaStackProps extends cdk.NestedStackProps, EnvironmentAwareNestedStackProps, VersionAwareNestedStackProps {
  worker: WorkerInterface;
}

export class WorkerLambdaStack extends cdk.NestedStack {
  constructor(scope: Construct, props: WorkerLambdaStackProps) {
    const { worker, version } = props;

    super(scope, `worker-${worker.name}-lambda-stack`, props);

    const repository = ecr.Repository.fromRepositoryAttributes(this, `Worker${worker.capitalizedName}Repository`, {
      repositoryArn: cdk.Fn.importValue(WorkerEcrStack.generateExportedRepositoryArnName(worker)),
      repositoryName: `moood-worker-${worker.name}`,
    });

    const lambdaFunction = new lambda.DockerImageFunction(this, `Worker${worker.capitalizedName}Function`, {
      code: lambda.DockerImageCode.fromEcr(repository, {
        tagOrDigest: version,
      }),
      environment: worker.environment,
      timeout: cdk.Duration.minutes(1),
      architecture: lambda.Architecture.ARM_64,
    });

    repository.grantPull(lambdaFunction);

    cdk.Tags.of(lambdaFunction).add('worker', worker.name);

    lambdaFunction.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['ecr:BatchGetImage', 'ecr:GetDownloadUrlForLayer'],
        resources: [repository.repositoryArn],
        effect: cdk.aws_iam.Effect.ALLOW,
      }),
    );

    const exportName = WorkerLambdaStack.generateExportedLambdaFunctionArn(worker);
    new cdk.CfnOutput(this, exportName, {
      value: lambdaFunction.functionArn,
      exportName: exportName,
    });
  }

  public static generateExportedLambdaFunctionArn(worker: WorkerInterface): string {
    return `exportedWorker${worker.capitalizedName}FunctionArn`;
  }
}
