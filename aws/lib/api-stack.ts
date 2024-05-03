import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { HTTPMethod } from 'http-method-enum';
import { StatusCodes } from 'http-status-codes';
import { StorageStack } from './storage-stack';

export class ApiStack extends cdk.NestedStack {
  static readonly exportedNewEntryHandlerArn = 'MooodNewEntryHandlerFunctionArn';
  constructor(scope: Construct, props: cdk.NestedStackProps) {
    super(scope, 'api-stack', props);

    const api = new apigateway.RestApi(this, 'MooodApi', {
      deployOptions: {
        stageName: 'v1',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: [HTTPMethod.GET, HTTPMethod.POST, HTTPMethod.PUT, HTTPMethod.DELETE],
      },
    });

    const entryRequestSchema = {
      schema: apigateway.JsonSchemaVersion.DRAFT7,
      type: apigateway.JsonSchemaType.OBJECT,
      properties: {
        data: {
          type: apigateway.JsonSchemaType.OBJECT,
          properties: {
            type: {
              type: apigateway.JsonSchemaType.STRING,
              enum: ['entry'],
            },
            attributes: {
              type: apigateway.JsonSchemaType.OBJECT,
              properties: {
                entry: {
                  type: apigateway.JsonSchemaType.STRING,
                  minLength: 1,
                },
              },
              required: ['entry'],
            },
          },
          required: ['attributes'],
        },
      },
      required: ['data'],
    };

    const entryRequestModel = api.addModel('EntryRequestModel', {
      contentType: 'application/vnd.api+json',
      modelName: 'EntryRequest',
      schema: entryRequestSchema,
    });

    const entryResponseSchema = {
      schema: apigateway.JsonSchemaVersion.DRAFT7,
      type: apigateway.JsonSchemaType.OBJECT,
      properties: {
        data: {
          type: apigateway.JsonSchemaType.OBJECT,
          properties: {
            type: {
              type: apigateway.JsonSchemaType.STRING,
              enum: ['entry'],
            },
            attributes: {
              type: apigateway.JsonSchemaType.OBJECT,
              properties: {
                entry: {
                  type: apigateway.JsonSchemaType.STRING,
                  minLength: 1,
                },
                createdAt: {
                  type: apigateway.JsonSchemaType.STRING,
                },
              },
              required: ['entry', 'createdAt'],
            },
          },
          required: ['attributes'],
        },
      },
      required: ['data'],
    };

    const entryResponseModel = api.addModel('EntryResponseModel', {
      contentType: 'application/vnd.api+json',
      modelName: 'EntryResponse',
      schema: entryResponseSchema,
    });

    const putRole = new iam.Role(this, 'ApiGatewayFunctionRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });

    putRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem', 'dynamodb:Query'],
        resources: [cdk.Fn.importValue(StorageStack.exportedEntryTableArn)],
      }),
    );

    const integration = new apigateway.AwsIntegration({
      service: 'dynamodb',
      action: 'PutItem',
      options: {
        credentialsRole: putRole,
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
        integrationResponses: [
          {
            selectionPattern: '200',
            statusCode: StatusCodes.CREATED.toString(),
            responseTemplates: {
              'application/json': JSON.stringify({
                data: {
                  type: 'entry',
                  id: '$context.requestId',
                  attributes: {},
                },
              }),
            },
          },
          {
            selectionPattern: '4\\d{2}',
            statusCode: StatusCodes.BAD_REQUEST.toString(),
            responseTemplates: {
              'application/json': JSON.stringify({
                errors: [
                  {
                    status: StatusCodes.BAD_REQUEST,
                    title: 'Bad Request',
                    detail: 'Invalid request payload',
                  },
                ],
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': JSON.stringify({
            TableName: cdk.Fn.importValue(StorageStack.exportedEntryTableName),
            Item: {
              pk: {
                S: '$context.requestId',
              },
              entry: {
                S: "$input.path('$.data.attributes.entry')",
              },
              createdAt: {
                S: '$context.requestTimeEpoch',
              },
            },
          }),
        },
      },
    });

    const entriesResource = api.root.addResource('entries');
    entriesResource.addMethod(HTTPMethod.POST, integration, {
      requestValidator: new apigateway.RequestValidator(this, 'RequestValidator', {
        requestValidatorName: 'EntryValidator',
        validateRequestBody: true,
        validateRequestParameters: false,
        restApi: api,
      }),
      requestModels: { 'application/json': entryRequestModel },
      methodResponses: [
        {
          statusCode: StatusCodes.CREATED.toString(),
          responseModels: { 'application/json': entryResponseModel },
        },
        {
          statusCode: StatusCodes.BAD_REQUEST.toString(),
          //responseModels: { 'application/json': entryResponseModel },
        },
      ],
    });
  }
}
