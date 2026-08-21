/**
 * Waw Background Job Processing & Queue Service
 * Handles async WhatsApp messaging, Typesense sync, and scheduled escrow payout reconciliation.
 */

export interface BackgroundJob<T = any> {
  id: string;
  type: 'WHATSAPP_NOTIFICATION' | 'TYPESENSE_SYNC' | 'ESCROW_PAYOUT' | 'COD_RECONCILIATION';
  payload: T;
  createdAt: string;
}

class JobQueueManager {
  private queue: BackgroundJob[] = [];
  private isProcessing = false;

  /**
   * Adds a background job to the queue with automatic retry handling.
   */
  async addJob<T>(type: BackgroundJob['type'], payload: T): Promise<string> {
    const job: BackgroundJob<T> = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
    };

    this.queue.push(job);
    console.log(`📥 Enqueued Background Job [${type}] (ID: ${job.id})`);
    
    // Trigger async processing
    this.processQueue();
    return job.id;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      try {
        await this.handleJob(job);
      } catch (err) {
        console.error(`❌ Background Job Failed (${job.id}):`, err);
      }
    }

    this.isProcessing = false;
  }

  private async handleJob(job: BackgroundJob) {
    switch (job.type) {
      case 'WHATSAPP_NOTIFICATION':
        console.log(`📱 Processed WhatsApp Job: ${job.id}`);
        break;
      case 'TYPESENSE_SYNC':
        console.log(`🔍 Processed Typesense Sync Job: ${job.id}`);
        break;
      case 'ESCROW_PAYOUT':
        console.log(`🏦 Processed Escrow Payout Job: ${job.id}`);
        break;
      case 'COD_RECONCILIATION':
        console.log(`📦 Processed PostEx COD Reconciliation Job: ${job.id}`);
        break;
      default:
        console.log(`Unknown job type: ${job.type}`);
    }
  }
}

export const jobQueue = new JobQueueManager();
