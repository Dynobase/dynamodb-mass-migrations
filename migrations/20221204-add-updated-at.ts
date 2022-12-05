export const up = async (item: any, tableName: string): Promise<any> => {
  return {
    ...item,
    updatedAt: new Date().toISOString(),
  };
};

export const down = async (item: any, tableName: string): Promise<any> => {
  return {
    ...item,
    updatedAt: undefined,
  };
};
