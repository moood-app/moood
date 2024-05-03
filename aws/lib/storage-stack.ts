import * as cdk from 'aws-cdk-lib';
import * as docdb from 'aws-cdk-lib/aws-docdb';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { VpcAwareNestedStackProps } from './moood-stack';

interface StorageStackProps extends cdk.NestedStackProps, VpcAwareNestedStackProps {}

export class StorageStack extends cdk.NestedStack {
  static readonly exportedEntryTableArn = 'DynamoDbEntryTableArn';
  static readonly exportedEntryTableStreamArn = 'DynamoDbEntryTableStreamArn';
  static readonly exportedEntryTableName = 'DynamoDbEntryTableName';
  static readonly exportedClusterIdentifier = 'DocumentDbClusterIdentifier';
  static readonly exportedSecretArn = 'DocumentDbSecretArn';
  static readonly exportedSecretName = 'DocumentDbSecretName';

  constructor(scope: Construct, props: StorageStackProps) {
    super(scope, 'storage-stack', props);

    const table = new dynamodb.TableV2(this, 'EntryTable', {
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      tableName: 'EntryTable',
      encryption: dynamodb.TableEncryptionV2.awsManagedKey(),
      //deletionProtection: true,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      dynamoStream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    const { vpc } = props;

    const cluster = new docdb.DatabaseCluster(this, 'MooodDocumentDBCluster', {
      masterUser: {
        username: 'moood_admin',
        secretName: '/moood/docdb/masteruser',
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }),
      vpc,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    cluster.connections.allowFrom(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(27017));

    new cdk.CfnOutput(this, StorageStack.exportedEntryTableArn, {
      value: table.tableArn,
      exportName: StorageStack.exportedEntryTableArn,
    });

    new cdk.CfnOutput(this, StorageStack.exportedEntryTableName, {
      value: table.tableName,
      exportName: StorageStack.exportedEntryTableName,
    });

    new cdk.CfnOutput(this, StorageStack.exportedEntryTableStreamArn, {
      value: table.tableStreamArn!,
      exportName: StorageStack.exportedEntryTableStreamArn,
    });

    new cdk.CfnOutput(this, StorageStack.exportedClusterIdentifier, {
      value: cluster.clusterIdentifier,
      exportName: StorageStack.exportedClusterIdentifier,
    });

    new cdk.CfnOutput(this, StorageStack.exportedSecretArn, {
      value: cluster.secret!.secretArn,
      exportName: StorageStack.exportedSecretArn,
    });

    new cdk.CfnOutput(this, StorageStack.exportedSecretName, {
      value: cluster.secret!.secretName,
      exportName: StorageStack.exportedSecretName,
    });
  }
}
