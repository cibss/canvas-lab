import type {
  PerformanceWorkerRequest,
  PerformanceWorkerResponse,
} from "./performanceWorkerProtocol";
import { executePerformanceWorkerRequest } from "./performanceWorkerTask";

interface PerformanceWorkerScope {
  onmessage: ((event: MessageEvent<PerformanceWorkerRequest>) => void) | null;

  postMessage: (message: PerformanceWorkerResponse) => void;
}

const workerScope = self as unknown as PerformanceWorkerScope;

workerScope.onmessage = (event) => {
  const response = executePerformanceWorkerRequest(event.data);

  workerScope.postMessage(response);
};

export {};
