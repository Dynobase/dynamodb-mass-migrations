import * as cdk from "aws-cdk-lib";
import { CfnOutput } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  CfnStateMachine,
  Pass,
  StateMachine,
} from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { asl } from "./asl";
export class DynamodbMassMigrationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, "SampleItemsTable", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const resultsBucket = new Bucket(this, "ResultsBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const migrationFunction = new NodejsFunction(this, "MigrationFunction", {
      entry: "./lib/migrationFunction.ts",
    });
    table.grantFullAccess(migrationFunction);

    const stateMachine = new StateMachine(this, "MigrationStateMachine", {
      definition: new Pass(this, "StartState"),
    });
    const cfnStatemachine = stateMachine.node.defaultChild as CfnStateMachine;
    resultsBucket.grantReadWrite(stateMachine);
    migrationFunction.grantInvoke(stateMachine);
    stateMachine.addToRolePolicy(
      new PolicyStatement({
        actions: ["states:StartExecution"],
        resources: ["*"],
      })
    );

    cfnStatemachine.definitionString = JSON.stringify(
      asl(migrationFunction.functionArn, resultsBucket.bucketName)
    );

    new CfnOutput(this, "MigrationMachineArn", {
      value: stateMachine.stateMachineArn,
    });
    new CfnOutput(this, "SampleItemsTableName", {
      value: table.tableName,
    });
  }
}
