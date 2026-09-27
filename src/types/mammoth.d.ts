declare module "mammoth" {
  export interface Result {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface Options {
    buffer: Buffer | ArrayBuffer | Uint8Array;
    [key: string]: unknown;
  }

  export function extractRawText(options: Options): Promise<Result>;
  export function convertToHtml(options: Options): Promise<Result>;
}
