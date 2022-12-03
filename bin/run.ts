import { StepFunctions } from "aws-sdk";

const stateMachineArn = process.env.SFN_ARN;
const totalSegments = process.env.TOTAL_SEGMENTS
  ? parseInt(process.env.TOTAL_SEGMENTS, 10)
  : 100;
const tableName = process.env.TABLE_NAME ?? "some-table";

if (!stateMachineArn) {
  throw new Error("SFN_ARN not set");
}

const region = stateMachineArn.split(":")[3];

const sfn = new StepFunctions({ region });

const payload = new Array(totalSegments).fill(1).map((_, i) => ({
  segment: i.toString(),
  totalSegments,
  tableName,
}));

sfn
  .startExecution({
    stateMachineArn,
    input: JSON.stringify(payload),
  })
  .promise()
  .then((r) => {
    const detailsUrl = `https://${region}.console.aws.amazon.com/states/home?region=${region}#/v2/executions/details/${r.executionArn}`;

    console.log(
      `Migration started! See the process in your browser here: ${detailsUrl}`
    );
  })
  .catch(console.error);
