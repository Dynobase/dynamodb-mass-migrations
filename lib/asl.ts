export const asl = (lambdaArn: string, resultsBucket: string) => ({
  Comment: "Parallel migration state machine",
  StartAt: "Should pre-warm the table?",
  States: {
    "Should pre-warm the table?": {
      Type: "Choice",
      Choices: [
        {
          Not: {
            Variable: "$.prewarm",
            BooleanEquals: true,
          },
          Next: "Parallel Migration",
        },
      ],
      Default: "Pre-warm table throughput",
      Comment:
        "On-demand tables can process 2,000 write request units or 6,000 read request units immediately. If more is needed, you can pre-warm your table",
    },
    "Pre-warm table throughput": {
      Type: "Task",
      Next: "Wait 10 seconds",
      Parameters: {
        "TableName.$": "$.map[0].tableName",
        BillingMode: "PROVISIONED",
        ProvisionedThroughput: {
          "ReadCapacityUnits.$": "$.prewarmRCU",
          "WriteCapacityUnits.$": "$.prewarmWCU",
        },
      },
      Resource: "arn:aws:states:::aws-sdk:dynamodb:updateTable",
      ResultPath: null,
      Comment:
        "https://aws.amazon.com/blogs/database/running-spiky-workloads-and-optimizing-costs-by-more-than-90-using-amazon-dynamodb-on-demand-capacity-mode/",
    },
    "Wait 10 seconds": {
      Type: "Wait",
      Seconds: 10,
      Next: "Check Table's status",
      Comment: "Poll for table readiness",
    },
    "Check Table's status": {
      Type: "Task",
      Next: "Is table's capacity already provisioned?",
      Parameters: {
        "TableName.$": "$.map[0].tableName",
      },
      Resource: "arn:aws:states:::aws-sdk:dynamodb:describeTable",
      ResultPath: "$.tableDescription",
    },
    "Is table's capacity already provisioned?": {
      Type: "Choice",
      Choices: [
        {
          Variable: "$.tableDescription.Table.TableStatus",
          StringEquals: "UPDATING",
          Next: "Wait 10 seconds",
          Comment: "Is table ready?",
        },
      ],
      Default: "Switch back to On-Demand capacity mode",
    },
    "Switch back to On-Demand capacity mode": {
      Type: "Task",
      Next: "Parallel Migration",
      Parameters: {
        "TableName.$": "$.map[0].tableName",
        BillingMode: "PAY_PER_REQUEST",
      },
      Resource: "arn:aws:states:::aws-sdk:dynamodb:updateTable",
    },
    "Parallel Migration": {
      Type: "Map",
      ItemProcessor: {
        ProcessorConfig: {
          Mode: "DISTRIBUTED",
          ExecutionType: "EXPRESS",
        },
        StartAt: "Transform Function",
        States: {
          "Transform Function": {
            Type: "Task",
            Resource: "arn:aws:states:::lambda:invoke",
            OutputPath: "$.Payload",
            Parameters: {
              "Payload.$": "$",
              FunctionName: lambdaArn,
            },
            Retry: [
              {
                ErrorEquals: [
                  "Lambda.ServiceException",
                  "Lambda.AWSLambdaException",
                  "Lambda.SdkClientException",
                  "Lambda.TooManyRequestsException",
                ],
                IntervalSeconds: 2,
                MaxAttempts: 3,
                BackoffRate: 2,
              },
            ],
            End: true,
          },
        },
      },
      End: true,
      Label: "ParallelMigration",
      ResultWriter: {
        Resource: "arn:aws:states:::s3:putObject",
        Parameters: {
          Bucket: resultsBucket,
          Prefix: "results",
        },
      },
      Retry: [
        {
          ErrorEquals: ["States.ALL"],
          BackoffRate: 1,
          IntervalSeconds: 1,
          MaxAttempts: 3,
        },
      ],
      InputPath: "$.map",
    },
  },
});
