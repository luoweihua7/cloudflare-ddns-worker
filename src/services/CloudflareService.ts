import Logger from '../utils/logger';
import req from '../utils/request';
import CODES from '../config/code';

import { IDDNSInitOptions, IDDNSUpdateOptions } from '../types';

enum APIS {
  List = 'DescribeSubDomainRecords',
  Create = 'AddDomainRecord',
  Update = 'UpdateDomainRecord',
}

const logger = Logger('Cloudflare');

export default class CloudflareService {
  private baseURL = 'https://api.cloudflare.com/client/v4';

  constructor(options: IDDNSInitOptions) {
    const { id, key } = options;

    if (!key) {
      logger.fatal(`初始化 CloudflareService 失败，参数错误: ${JSON.stringify(options)}`);
      throw new Error(`[CloudflareService] Parameter error, key or token is required`);
    }

    if (id) {
      this.headers = {
        'X-Auth-Email': id,
        'X-Auth-Key': key,
      };
    } else {
      this.headers = {
        Authorization: `Bearer ${key}`,
      };
    }
  }

  async request(options: IDDNSUpdateOptions) {
    const { method = 'POST', params, data } = options;
    let { url } = options;

    const initOptions = {
      method,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
        'Content-type': 'application/json',
        ...this.headers,
      },
    };

    url = `${this.baseURL}/${url}`;
    if (typeof params === 'object') {
      url = req.addParams(url, params);
    }

    if (['POST', 'PUT'].includes(method.toUpperCase())) {
      initOptions.body = JSON.stringify(data);
    }

    logger.debug(`请求链接`, url);
    logger.debug(`请求参数`, initOptions);
    const response = await fetch(url, initOptions);
    const json = await response.json();
    logger.debug(`请求响应`, json);

    return json;
  }

  async get(url: string, params: Record<string, any>) {
    return await this.request({ url, method: 'GET', params });
  }

  async post(url: string, data: Record<string, any>, options: record<string, any>) {
    return await this.request({ url, method: 'POST', data, ...options });
  }

  async put(url: string, data: Record<string, any>, options: Record<string, any>) {
    return await this.request({ url, method: 'PUT', data, ...options });
  }

  async getZone(domain: string) {
    const { success, result = [] } = await this.get(`/zones`, { name: domain });

    let zone = null;

    if (result.length > 0) {
      zone = result[0] || {};
      logger.info(`获取 ${domain} 的zone完成：${JSON.stringify({ id: zone.id, name: zone.zone })}`);
    }

    return zone;
  }

  async getRecordId(zoneId: string, options: IDDNSUpdateOptions) {
    const { domain, record, type } = options;

    const { success, result = [] } = await this.get(`zones/${zoneId}/dns_records`, {
      name: `${record}.${domain}`,
      type,
    });
    const [firstRecord] = result;

    let ret = {};
    if (firstRecord) {
      const recordId = firstRecord.id;
      logger.info(`获取 ${record}.${domain} 的 ${type} 记录完成，记录ID为：${recordId}`);
      ret = { recordId };
    } else {
      logger.info(`获取 ${record}.${domain} 的 ${type} 记录完成，记录不存在`);
      ret = { recordId: 0 };
    }

    return ret;
  }

  async updateRecord(zoneId: string, options: IDDNSUpdateOptions) {
    const { recordId, domain, record, type = 'A', ip } = options;

    const url = `/zones/${zoneId}/dns_records/${recordId || ''}`;
    const action = recordId ? 'put' : 'post';

    const {
      success,
      result = {},
      errors,
    } = await this[action](url, {
      name: `${record}.${domain}`,
      type,
      content: ip,
      ttl: 60,
    }).catch((e) => {
      logger.warn(`添加 ${record}.${domain} 的 ${type} 记录失败：${e.message}`);
      return {
        success: false,
        errors: {
          ...e,
          options,
          message: `添加 ${record}.${domain} 的 ${type} 记录失败，可能是记录已存在或者参数错误，请手动检查`,
        },
      };
    });

    let ret = {};

    if (success) {
      logger.info(`添加或更新 ${record}.${domain} 的 ${type} 记录完成：${JSON.stringify(result)}`);

      ret = { data: result };
    } else {
      logger.info(`添加或更新 ${record}.${domain} 的 ${type} 记录失败：${JSON.stringify(errors)}`);
      ret = { error: errors };
    }

    return ret;
  }

  async update(options: IDDNSUpdateOptions) {
    const { domain, record, type = 'A', ip } = options;
    let result = null;

    try {
      const zone = await this.getZone(domain);
      const { id: zoneId } = zone || {};

      if (zoneId) {
        logger.info(`获取域名 ${domain} 相应的Zone为 ${zoneId}`);
        const { recordId, error } = await this.getRecordId(zoneId, options);
        let data = null;

        if (error) {
          data = error;
        } else {
          const { data: updateRes, error } = await this.updateRecord(zoneId, { recordId, ...options });
          data = error || updateRes;
        }

        result = { code: 0, message: '操作完成', data };
      } else {
        const msg = `未获取域名 ${domain} 相对应的Zone信息`;
        logger.warn(msg);

        ret = { error: msg };
      }
    } catch (e) {
      logger.error(`更新 ${domain} 的 ${record} 的 ${type} 记录出现未知错误，错误信息：${e.message}, 堆栈：${e.stack}`);
      result = { code: CODES.UNKNOW_ERROR, message: '请求错误', data: e?.data };
    }

    return result;
  }
}
