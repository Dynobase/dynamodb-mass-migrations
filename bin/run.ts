import { StepFunctions, DynamoDB } from "aws-sdk";
import { readdirSync } from "fs";

interface MapItem {
  segment: string;
  totalSegments: number;
  tableName: string;
  migrationsToRun: string[];
}
interface Payload {
  map: MapItem[];
  prewarm: boolean;
  prewarmWCU?: number;
  prewarmRCU?: number;
}

const migrationsPath = process.env.MIGRATIONS_PATH ?? "./migrations";
const migrationsTable = process.env.MIGRATIONS_TABLE;
const stateMachineArn = process.env.SFN_ARN;
const totalSegments = process.env.TOTAL_SEGMENTS
  ? parseInt(process.env.TOTAL_SEGMENTS, 10)
  : 100;
const tableName = process.env.TABLE_NAME ?? "some-table";

async function run() {
  if (!stateMachineArn) {
    throw new Error("SFN_ARN not set");
  }
  if (!migrationsTable) {
    throw new Error("MIGRATIONS_TABLE not set");
  }

  const region = stateMachineArn.split(":")[3];
  const sfn = new StepFunctions({ region });
  const dynamodb = new DynamoDB.DocumentClient({ region });

  const allMigrations = readdirSync(migrationsPath);
  const migrationsRan = await dynamodb
    .scan({ TableName: migrationsTable })
    .promise();

  const migrationsToRun = allMigrations.filter(
    (migration) =>
      !migrationsRan.Items?.find(
        (ranMigration) => ranMigration.normalizedName === migration
      )
  );

  console.log("Migrations to run: ", migrationsToRun);

  const map: MapItem[] = new Array(totalSegments).fill(1).map((_, i) => ({
    segment: i.toString(),
    totalSegments,
    tableName,
    migrationsToRun,
  }));

  const payload: Payload = {
    map,
    prewarm: false,
  };

  if (process.env.PREWARM === "true") {
    payload.prewarm = true;
    payload.prewarmWCU = parseInt(process.env.PREWARM_WCU ?? "4000", 10);
    payload.prewarmRCU = parseInt(process.env.PREWARM_RCU ?? "12000", 10);

    console.log(
      `Pre-warming table with ${payload.prewarmWCU} WCU and ${payload.prewarmRCU} RCU`
    );
  }

  const result = await sfn
    .startExecution({
      stateMachineArn,
      input: JSON.stringify(payload),
    })
    .promise();

  const detailsUrl = `https://${region}.console.aws.amazon.com/states/home?region=${region}#/v2/executions/details/${result.executionArn}`;

  console.log(
    `Migration started!
    See the process in your browser here: ${detailsUrl}`
  );
}

run().catch(console.error);
