//interface MockQueue {
//    add: jest.Mock;
//    process: jest.Mock;
//    on: jest.Mock;
//    getJobs: jest.Mock;
//    getJob: jest.Mock;
//    getJobCounts: jest.Mock;
//    getActiveCount: jest.Mock;
//    getCompletedCount: jest.Mock;
//    getFailedCount: jest.Mock;
//    getDelayedCount: jest.Mock;
//    getWaitingCount: jest.Mock;
//  }
//
//  let mockQueue: MockQueue;

// Setup mock queue
export const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: "job-123" }),
  process: jest.fn(),
  on: jest.fn(),
  getJob: jest.fn().mockResolvedValue({
    id: "job-123",
    retry: jest.fn().mockResolvedValue({}),
  }),
  getJobs: jest.fn().mockResolvedValue([]),
  getJobCounts: jest.fn().mockResolvedValue({
    active: 1,
    completed: 5,
    failed: 2,
    delayed: 1,
    waiting: 3,
  }),
  getActiveCount: jest.fn().mockResolvedValue(1),
  getCompletedCount: jest.fn().mockResolvedValue(5),
  getFailedCount: jest.fn().mockResolvedValue(2),
  getDelayedCount: jest.fn().mockResolvedValue(1),
  getWaitingCount: jest.fn().mockResolvedValue(3),
};
