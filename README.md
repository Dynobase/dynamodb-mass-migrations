# Massively parallel migrations in DynamoDB

Thanks to recent accouncement of [Step Functions Distributed Map](https://aws.amazon.com/blogs/aws/step-functions-distributed-map-a-serverless-solution-for-large-scale-parallel-data-processing/), we can now run 10,000 of parallel executions in Step Functions. This is especially useful for transforming/migrating big datasets in DynamoDB.

This repo contains a sample [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/home.html) code for performing such a migration.

Because AWS CDK does not support Step Functions Distributed Map yet, we need to use ASL definition directly. This is a bit tricky, but not too hard.

## How to use

0. Make sure you have `aws-cdk` installed.

1. Install dependencies

```bash
git clone https://github.com/dynobase/dynamodb-mass-migration
cd dynamodb-mass-migration
npm i
```

2. Go to `lib/migrationFunction.ts` and adjust your migration logic inside `transformFn`. By default, it just adds `updatedAt` attribute to each item.

3. Deploy the stack:

```bash
npx cdk deploy
```

4. After deploying, invoke the migrating state machine:

```bash
SFN_ARN=<arn-of-the-deployed-state-machine> \
TABLE_NAME=<name-of-the-table-to-migrate> \
TOTAL_SEGMENTS=100 \ # number of segments to split the table, should be less than 10,000
npx ts-node bin/run.ts
```
