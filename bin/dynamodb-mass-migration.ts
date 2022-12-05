#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { DynamoDBMigrations } from "../lib/constructs";

class DynamodbMassMigrationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, "SampleItemsTable", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const migrations = new DynamoDBMigrations(this, "DynamoDBMigrations", {
      tables: [table],
      migrationsPath: "./migrations",
    });
  }
}

const app = new cdk.App();
new DynamodbMassMigrationStack(app, "DynamodbMassMigrationStack");
