import AliOSS from 'ali-oss';

import { IGatewayOptions, OpenGateWay } from './OpenGateway';
import {
  CommonRequestOptions,
  CreateStatus,
  GetH5PackageVersionListOptions,
  H5PackageVersion,
  IGetCreateStatusResult,
  IGetUploadTokenResult,
  ReleaseCommonOptions,
} from './types';

export interface ISdkOptions extends IGatewayOptions {}

export interface IUploadOptions {
  miniAppId: string;
  file: string;
}

export interface IPublishOptions {
  miniAppId: string;
  version: string;
}

const enum OpenApiAction {
  GetUploadToken = '/v1.0/package/uploadTokens',
  UploadPackage = '/v1.0/package/h5/asyncUpload',
  GetUploadStatus = '/v1.0/package/h5/uploadStatus',
  Close = '/v1.0/package/h5/close',
  Publish = 'v1.0/package/h5/publish',
  VersionList = 'v1.0/package/h5/versions',
  GrayDeploy = 'v1.0/package/release/gray/deploy',
  GrayExit = 'v1.0/package/release/gray/exit',
  GrayGetUserPercent = 'v1.0/package/release/gray/user/percent',
  GraySetUserPercent = 'v1.0/package/release/gray/user/percent',
  GrayGetOrg = 'v1.0/package/release/gray/org',
  GraySetOrg = 'v1.0/package/release/gray/org',
  GrayGetUserStaffIds = 'v1.0/package/release/gray/user/staffIds',
  GraySetUserStaffIds = 'v1.0/package/release/gray/user/staffIds',
}

export interface ICreatePackageResult {
  taskId: string;
}

export class MiniAppOpenSDK {
  private sdkConfig?: ISdkOptions;
  private gateway!: OpenGateWay;

  setConfig(sdkConfig: ISdkOptions) {
    this.sdkConfig = sdkConfig;
    this.gateway = new OpenGateWay(sdkConfig);
  }

  private async pollingCreateStatusWhenFinished(opts: {
    miniAppId: string;
    taskId: string;
    beginTime: number;
    maxTimeoutLimit: number;
  }): Promise<IGetCreateStatusResult> {
    const createStatus = await this.gateway.request<IGetCreateStatusResult>(
      'GET',
      OpenApiAction.GetUploadStatus,
      {
        miniAppId: opts.miniAppId,
        taskId: opts.taskId,
      }
    );

    switch (createStatus.status) {
    case CreateStatus.Packing: {
      const now = Date.now();
      const costTime = now - opts.beginTime;

      if (costTime > opts.maxTimeoutLimit) {
        throw new Error('create package timeout');
      }

      // eslint-disable-next-line no-console
      console.log('uploading, query task status 10s later');
      return new Promise<IGetCreateStatusResult>((r, c) => {
        setTimeout(() => {
          this.pollingCreateStatusWhenFinished({ ...opts, }).then(r, c);
        }, 10 * 1000);
      });
    }
    case CreateStatus.Success: {
      // eslint-disable-next-line no-console
      console.log('create task is finished', createStatus);
      return createStatus;
    }
    case CreateStatus.Failed: {
      throw new Error('create package failed');
    }
    case CreateStatus.Timeout: {
      throw new Error('create package timeout, please try again');
    }
    default: {
      throw new Error(`unknown create status: ${createStatus.status}`);
    }
    }
  }

  public async createPackage(options: IUploadOptions) {
    const maxTimeoutLimit = 1000 * 60 * 5; // 5 minutes
    const { file, ...commonParamenters } = options;
    const { name, ...ossConfig } =
      await this.gateway.request<IGetUploadTokenResult>(
        'GET',
        OpenApiAction.GetUploadToken,
        commonParamenters
      );
    const ossClient = new AliOSS({
      ...ossConfig,
      secure: true,
    });

    await ossClient.put(name, file);
    const createResult = await this.gateway.request<ICreatePackageResult>(
      'POST',
      OpenApiAction.UploadPackage,
      {},
      {
        ...commonParamenters,
        ossObjectKey: name,
      }
    );

    const packageInfo = await this.pollingCreateStatusWhenFinished({
      ...commonParamenters,
      taskId: createResult.taskId,
      beginTime: Date.now(),
      maxTimeoutLimit,
    });

    return packageInfo;
  }

  public async publishPackage(options: IPublishOptions) {
    return this.gateway.request<void>(
      'POST',
      OpenApiAction.Publish,
      {},
      options
    );
  }

  public async getVersionList(options: GetH5PackageVersionListOptions) {
    return this.gateway.request<{
      list: H5PackageVersion[];
      totalCount: number;
    }>('GET', OpenApiAction.VersionList, {
      ...options,
    });
  }

  public async deployToGray(options: ReleaseCommonOptions): Promise<void> {
    return this.gateway.request<void>(
      'POST',
      OpenApiAction.GrayDeploy,
      {},
      options
    );
  }

  public async exitFromGray(options: ReleaseCommonOptions): Promise<void> {
    return this.gateway.request<void>(
      'POST',
      OpenApiAction.GrayExit,
      {},
      {
        ...options,
      }
    );
  }

  public async closePackage(options: CommonRequestOptions): Promise<void> {
    return this.gateway.request<void>(
      'POST',
      OpenApiAction.Close,
      {},
      {
        ...options,
      }
    );
  }

  public async getGrayUserPercent(
    options: ReleaseCommonOptions
  ): Promise<{ value: number }> {
    return this.gateway.request<{ value: number }>(
      'GET',
      OpenApiAction.GrayGetUserPercent,
      {},
      options
    );
  }

  public async setGrayUserPercent(options: {
    miniAppId: string;
    version: string;
    value: number;
  }): Promise<void> {
    return this.gateway.request<void>(
      'POST',
      OpenApiAction.GraySetUserPercent,
      {},
      options
    );
  }

  public async getGrayOrg(
    options: ReleaseCommonOptions
  ): Promise<{ value: string[] }> {
    return this.gateway.request<{ value: string[] }>(
      'GET',
      OpenApiAction.GrayGetOrg,
      {},
      options
    );
  }

  public async setGrayOrg(options: {
    miniAppId: string;
    version: string;
    value: string[];
  }): Promise<void> {
    return this.gateway.request<void>(
      'POST',
      OpenApiAction.GraySetOrg,
      {},
      options
    );
  }

  public async getGrayUserStaffIds(
    options: ReleaseCommonOptions
  ): Promise<{ value: string[] }> {
    return this.gateway.request<{ value: string[] }>(
      'GET',
      OpenApiAction.GrayGetUserStaffIds,
      {},
      options
    );
  }

  public async setGrayUserStaffIds(options: {
    miniAppId: string;
    version: string;
    value: string[];
  }): Promise<void> {
    return this.gateway.request<void>(
      'POST',
      OpenApiAction.GraySetUserStaffIds,
      {},
      options
    );
  }
}
