import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as pipes from 'aws-cdk-lib/aws-pipes';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { WorkerRegistryAwareNestedStackProps } from './moood-stack';
import { StorageStack } from './storage-stack';
import { WorkerLambdaStack } from './workers/worker-lambda-stack';
import { WorkerInterface } from './workers/worker-registry';

interface OrchestrationNestedStackProps extends cdk.NestedStackProps, WorkerRegistryAwareNestedStackProps {}

export class OrchestrationStack extends cdk.NestedStack {
  constructor(scope: Construct, props: OrchestrationNestedStackProps) {
    super(scope, 'orchestration-stack', props);

    const { registry } = props;

    const workers = new sfn.Parallel(this, 'EntryParallelProcessing', {});
    registry.all.forEach((worker: WorkerInterface) => {
      workers.branch(
        new tasks.LambdaInvoke(this, `Worker${worker.capitalizedName}Task`, {
          lambdaFunction: lambda.Function.fromFunctionArn(
            this,
            `Worker${worker.capitalizedName}Function`,
            cdk.Fn.importValue(WorkerLambdaStack.generateExportedLambdaFunctionArn(worker)),
          ),
          resultPath: `$.metadata.${worker.name}`,
        }),
      );
    });

    const entryWorkerMap = new sfn.Map(this, 'EntryWorkerIterator', {
      itemSelector: {
        id: sfn.JsonPath.stringAt('$$.Map.Item.Value.dynamodb.NewImage.pk.S'),
        entry: sfn.JsonPath.stringAt('$$.Map.Item.Value.dynamodb.NewImage.entry.S'),
        createdAt: sfn.JsonPath.stringAt('$$.Map.Item.Value.dynamodb.NewImage.createdAt.S'),
      },
    })
      .itemProcessor(workers)
      .next(
        new sfn.Pass(this, 'Persister', {
          result: sfn.Result.fromObject({ worker: 'persister' }),
        }),
      )
      .next(new sfn.Succeed(this, 'ProcessedEntry'));

    const stateMachine = new sfn.StateMachine(this, 'EntryStateMachine', {
      stateMachineName: 'EntryStateMachine',
      stateMachineType: sfn.StateMachineType.EXPRESS,
      definitionBody: sfn.DefinitionBody.fromChainable(entryWorkerMap),
      timeout: cdk.Duration.minutes(1),
      logs: {
        destination: new logs.LogGroup(this, 'EntryStateMachineLogGroup', {
          logGroupName: '/moood/entry-state-machine',
          retention: logs.RetentionDays.ONE_WEEK,
        }),
        level: sfn.LogLevel.ALL,
      },
    });

    const pipeRole = new iam.Role(this, 'PipeRole', {
      assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com'),
      inlinePolicies: {
        AllowStepFunctions: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['states:StartSyncExecution'],
              resources: [stateMachine.stateMachineArn],
            }),
          ],
        }),
        AllowDynamoDbStreams: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['dynamodb:DescribeStream', 'dynamodb:GetRecords', 'dynamodb:GetShardIterator', 'dynamodb:ListStreams'],
              resources: [cdk.Fn.importValue(StorageStack.exportedEntryTableStreamArn)],
            }),
          ],
        }),
      },
    });

    const pipeLogGroup = new logs.LogGroup(this, 'EventBridgetEntryPipeLogGroup', {
      logGroupName: '/moood/eventbridge-entry-pipe',
      retention: logs.RetentionDays.ONE_WEEK,
    });

    new pipes.CfnPipe(this, 'EntryPipe', {
      name: 'EntryPipe',
      roleArn: pipeRole.roleArn,
      logConfiguration: {
        cloudwatchLogsLogDestination: {
          logGroupArn: pipeLogGroup.logGroupArn,
        },
        level: 'INFO',
      },
      source: cdk.Fn.importValue(StorageStack.exportedEntryTableStreamArn),
      target: stateMachine.stateMachineArn,
      sourceParameters: {
        dynamoDbStreamParameters: {
          // @todo update batch size
          batchSize: 1,
          startingPosition: 'TRIM_HORIZON',
        },
      },
    });
  }
}
