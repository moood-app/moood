import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecrdeploy from 'cdk-ecr-deployment';
import { Construct } from 'constructs';
import * as path from 'path';
import { EnvironmentAwareNestedStackProps, VersionAwareNestedStackProps } from '../moood-stack';
import { WorkerInterface } from './worker-registry';

interface WorkerEcrStackProps extends cdk.NestedStackProps, EnvironmentAwareNestedStackProps, VersionAwareNestedStackProps {
  worker: WorkerInterface;
}

export class WorkerEcrStack extends cdk.NestedStack {
  constructor(scope: Construct, props: WorkerEcrStackProps) {
    const {
      worker,
      env: { account },
      version,
    } = props;

    super(scope, `worker-${worker.name}-ecr-stack`, props);

    const repository = new ecr.Repository(this, `MooodWorker${worker.capitalizedName}Repository`, {
      repositoryName: `moood-worker-${worker.name}`,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          description: 'Keeps a maximum number of images to minimize storage',
          maxImageCount: 10,
        },
      ],
    });

    const principal = new iam.ArnPrincipal(`arn:aws:iam::${account}:root`);
    repository.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowPullImage',
        effect: iam.Effect.ALLOW,
        actions: ['ecr:GetDownloadUrlForLayer', 'ecr:BatchCheckLayerAvailability', 'ecr:BatchGetImage'],
        principals: [principal],
      }),
    );
    repository.grantPull(principal);

    const asset = new DockerImageAsset(this, `Worker${worker.capitalizedName}DockerImageAsset`, {
      directory: path.join(__dirname, `../../../workers/${worker.name}`),
      buildArgs: {
        ...worker.buildArgs,
        platform: 'linux/amd64',
      },
    });

    const destinationImageName = `${repository.repositoryUri}:${version}`;
    new ecrdeploy.ECRDeployment(this, 'MooodEcrDeployment', {
      src: new ecrdeploy.DockerImageName(asset.imageUri),
      dest: new ecrdeploy.DockerImageName(destinationImageName),
    });

    const exportedRepositoryArnName = WorkerEcrStack.generateExportedRepositoryArnName(worker);
    new cdk.CfnOutput(this, exportedRepositoryArnName, {
      value: repository.repositoryArn,
      exportName: exportedRepositoryArnName,
    });
  }

  public static generateExportedRepositoryArnName(worker: WorkerInterface): string {
    return `exportedWorkerEcrRepositoryArn-${worker.name}`;
  }

  public static generateExportedAssetHashName(worker: WorkerInterface): string {
    return `exportedWorkerEcrAssetHash-${worker.name}`;
  }
}
