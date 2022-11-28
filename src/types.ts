export interface IGetUploadTokenResult {
  accessKeyId: string;
  accessKeySecret: string;
  stsToken: string;
  bucket: string;
  region: string;
  endpoint: string;
  name: string;
}

export const enum CreateStatus {
  Packing = '0',
  Success = '1',
  Failed = '2',
  Timeout = '5',
}

export interface IGetCreateStatusResult {
  status: string;
  taskId: string;
  version: string;
  finished: boolean;
}

export interface H5PackageVersion {
  taskId: string;
  status: CreateStatus;
  version?: string;
  finished: boolean;
  operationTime: number;
  creator?: string;
  packageSize: number;
  avaliable: 0 | 1;
}

export interface GetH5PackageVersionListOptions {
  miniAppId: string;
  pageNum?: number;
  pageSize?: number;
}

export interface CommonRequestOptions {
  miniAppId: string;
}

export interface ReleaseCommonOptions extends CommonRequestOptions {
  miniAppId: string;
  version: string;
}