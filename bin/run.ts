import { StepFunctions } from "aws-sdk";

interface Payload {
  map: any[];
  prewarm?: boolean;
  prewarmWCU?: string;
  prewarmRCU?: string;
}

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

const map = new Array(totalSegments).fill(1).map((_, i) => ({
  segment: i.toString(),
  totalSegments,
  tableName,
}));

const payload: Payload = {
  map,
};

if (process.env.PREWARM === "true") {
  payload.prewarm = true;
  payload.prewarmWCU = process.env.PREWARM_WCU ?? "4000";
  payload.prewarmRCU = process.env.PREWARM_RCU ?? "12000";

  console.log(
    `Pre-warming table with ${payload.prewarmWCU} WCU and ${payload.prewarmRCU} RCU`
  );
}

sfn
  .startExecution({
    stateMachineArn,
    input: JSON.stringify(payload),
  })
  .promise()
  .then((r) => {
    const detailsUrl = `https://${region}.console.aws.amazon.com/states/home?region=${region}#/v2/executions/details/${r.executionArn}`;

    console.log(
      `Migration started!
      See the process in your browser here: ${detailsUrl}`
    );
  })
  .catch(console.error);
