export const QUEUES = {
  CLICK_TRACKING: 'click-tracking',
  REVALIDATION: 'revalidation',
  STORAGE_CLEANUP: 'storage-cleanup',
  WEBHOOK_PROCESSING: 'webhook-processing',
} as const;

export const MAX_RETRIES = 3;
export const DLQ_SUFFIX = '.dlq';
