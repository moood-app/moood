import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MooodStack } from '../lib/moood-stack';

test('Dummy test', () => {
  const app = new cdk.App();
  const stack = new MooodStack(app);
  const template = Template.fromStack(stack);

});
