import { DynamoDB } from "aws-sdk";

const ddb = new DynamoDB.DocumentClient();

interface Event {
  segment: string;
  totalSegments: string;
  tableName: string;
}

export const handler = async ({
  segment,
  totalSegments,
  tableName,
}: Event): Promise<any> => {
  if (!tableName) {
    throw new Error("tableName not set");
  }
  if (!segment) {
    throw new Error("segment not set");
  }
  if (!totalSegments) {
    throw new Error("totalSegments not set");
  }
  const parsedTotalSegments = parseInt(totalSegments, 10);

  if (parsedTotalSegments > 10000) {
    throw new Error("totalSegments must be less than 10,000");
  }

  let firstRun = true;
  let nextPageToken;
  let totalItemsProcessed = 0;

  do {
    firstRun = false;
    const scanResult = await ddb
      .scan({
        TableName: tableName,
        TotalSegments: parsedTotalSegments,
        Segment: parseInt(segment, 10),
      })
      .promise();
    nextPageToken = scanResult.LastEvaluatedKey;
    totalItemsProcessed += scanResult.Count ?? 0;

    await Promise.all(
      (scanResult.Items ?? []).map((i) => transformFn(i, tableName))
    );
  } while (firstRun || nextPageToken);

  const result = {
    segment,
    totalProcessed: totalItemsProcessed,
    tableName,
    totalSegments,
  };

  console.log(result);
  return result;
};

async function transformFn(item: any, tableName: string): Promise<any> {
  await ddb
    .put({
      TableName: tableName,
      Item: {
        ...item,
        updatedAt: new Date().toISOString(),
      },
    })
    .promise();

  return item;
}
