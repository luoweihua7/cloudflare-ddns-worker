export * from './BaseTypes';
export * from './DNSPodTypes';
export * from './CloudflareTypes';
export * from './AliyunTypes';

export enum DDNSTypes {
  /**
   * 阿里云
   */
  Aliyun = 'ali',

  /**
   * 腾讯云DNSPod
   */
  DNSPod = 'dp',

  /**
   * Cloudflare
   */
  Cloudflare = 'cf',
}

export interface IDDNSInitOptions {
  id: string;
  key: string;
}

export interface IDDNSUpdateOptions {
  /**
   * 域名，gTLD
   */
  domain: string;
  /**
   * 域名记录，如 home, 或者如 way.to.home
   */
  record: string;
  /**
   * 新的IP地址
   */
  ip: string;
  /**
   * 解析记录类型，DDNS一般都是传A
   */
  type?: string;
  /**
   * TTL值，最小为1，DP会自动根据修正域名绑定的套餐范围外的值
   */
  ttl?: string | number;
}

/**
 * DNSPod Types Declare
 */

/**
 * Aliyun Types Declare
 */

/**
 * Cloudflare Types Declare
 */
