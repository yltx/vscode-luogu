import type { RecordBase } from 'luogu-api';

export const getLatestRecordId = (
  records: RecordBase[] | { [index: number]: RecordBase }
) => Object.values(records)[0]?.id;
