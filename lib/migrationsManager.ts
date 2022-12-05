import { DynamoDB } from "aws-sdk";

const ddb = new DynamoDB.DocumentClient();

export interface Migration {
  id: string;
  startedAt: string;
  completedAt?: string;
  executionArn?: string;
}

export const getRanMigrations = async (): Promise<Migration[]> => {
  if (!process.env.MIGRATIONS_TABLE_NAME) {
    throw new Error("MIGRATIONS_TABLE_NAME is not set");
  }

  const params = {
    TableName: process.env.MIGRATIONS_TABLE_NAME,
  };

  const scanResults = await ddb.scan(params).promise();
  const migrations = scanResults.Items as Migration[];

  return migrations;
};
