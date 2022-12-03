export const asl = (lambdaArn: string, resultsBucket: string) => ({
  Comment: "A description of my state machine",
  StartAt: "Map",
  States: {
    Map: {
      Type: "Map",
      ItemProcessor: {
        ProcessorConfig: {
          Mode: "DISTRIBUTED",
          ExecutionType: "EXPRESS",
        },
        StartAt: "Lambda Invoke",
        States: {
          "Lambda Invoke": {
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
      Label: "Map",
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
    },
  },
});
