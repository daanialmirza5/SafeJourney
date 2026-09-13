export interface StorageProvider {
  name: string;
  save(buffer: Buffer, key: string, mimeType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
}
