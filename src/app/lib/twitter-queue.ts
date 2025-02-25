// Simple queue system for Twitter API requests
class TwitterRequestQueue {
  private queue: Array<{
    endpoint: string;
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  private processing = false;
  private requestInterval = 1000; // 1 second between requests
  
  async enqueue<T>(endpoint: string, execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ endpoint, execute, resolve, reject });
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    const { endpoint, execute, resolve, reject } = this.queue.shift()!;
    
    try {
      // Check if we're rate limited for this endpoint
      if (isRateLimited(endpoint)) {
        const resetTime = new Date(rateLimits[endpoint].resetTime * 1000);
        reject(new TwitterClientError({
          code: 429,
          message: `Twitter API rate limit exceeded. Try again after ${resetTime.toLocaleTimeString()}.`
        }));
      } else {
        const result = await execute();
        resolve(result);
      }
    } catch (error: any) {
      if (error.code === 429) {
        setRateLimited(endpoint, error.rateLimit?.reset);
      }
      reject(error);
    }
    
    // Wait before processing the next request
    setTimeout(() => this.processQueue(), this.requestInterval);
  }
}

const twitterQueue = new TwitterRequestQueue();

// Then use it in your API calls:
export async function getUserTweets(username: string, count = 10) {
  // Check caches first...
  
  // If not in cache, queue the request
  return twitterQueue.enqueue('user_timeline', async () => {
    // API call logic here
  });
} 