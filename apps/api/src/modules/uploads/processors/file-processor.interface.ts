export interface FileProcessorResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, any>;
}

export interface IFileProcessor {
  process(filePath: string): Promise<FileProcessorResult>;
}
