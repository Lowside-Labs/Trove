export interface ProgressEvent {
  phase: string;
  message: string;
  completed?: number;
  total?: number;
}

export type ProgressHandler = (event: ProgressEvent) => void;
