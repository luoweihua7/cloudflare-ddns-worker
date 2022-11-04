import Core from '../libs/aliyun-core';

import Logger from '../utils/logger';
import req from '../utils/request';
import CODES from '../config/code';

import { IDDNSInitOptions, IDDNSUpdateOptions } from '../types/BaseTypes';

enum APIS {
  List = 'DescribeSubDomainRecords',
  Create = 'AddDomainRecord',
  Update = 'UpdateDomainRecord',
}

const logger = Logger('AliyunService');

export default class AliyunService {
  constructor(options: IDDNSInitOptions) {
    const { id, key } = options;

    this.client = new Core({
      accessKeyId: id,
      accessKeySecret: key,
      endpoint: 'https://dns.aliyuncs.com',
      apiVersion: '2015-01-09',
    });
  }

  async fetch(action, data, opts) {
    return await this.client.request(action, data, opts);
  }

  async getRecordId(options: IDDNSUpdateOptions) {
    const { domain, record, type = 'A' } = options;

    const res = await this.fetch('DescribeSubDomainRecords', {
      DomainName: domain,
      SubDomain: `${record}.${domain}`,
      Type: type,
    });

    const { TotalCount, DomainRecords } = res;
    let result = {};
    if (TotalCount > 0) {
      const { RecordId: id } = DomainRecords?.Record?.[0] || DomainRecords?.[0] || {}; // 默认取第一个，无法判断需要修改第几个记录
      logger.info(`获取 ${record}.${domain} 的 ${type} 记录完成，记录ID为：${id}`);
      result = { recordId: id };
    } else if (TotalCount === 0) {
      logger.info(`获取 ${record}.${domain} 的 ${type} 记录完成，记录不存在：${JSON.stringify(res)}`);
      result = { recordId: 0 };
    } else {
      logger.error(`获取 ${record}.${domain} 的 ${type} 记录出错，信息：${JSON.stringify(res)}`);
      result = { error: res };
    }

    return result;
  }

  async addRecord(options: IDDNSUpdateOptions) {
    const { domain, record, type = 'A', ip, ttl = 600 } = options;

    const res = await this.fetch('AddDomainRecord', {
      DomainName: domain,
      RR: record,
      Type: type,
      Value: ip,
      TTL: ttl,
    });

    let result = null;
    if (res?.RecordId) {
      logger.info(`[INFO] 添加 ${domain} 的 ${record} 记录成功，值为：${ip}`);
      result = { data: res.RecordId };
    } else {
      logger.info(`[INFO] 添加 ${domain} 的 ${record} 记录失败，信息：${JSON.stringify(res)}`);
      result = { error: res };
    }

    return result;
  }

  async updateRecord(options: IDDNSUpdateOptions) {
    const { recordId, domain, record, ip, type = 'A' } = options;

    try {
      const res = await this.fetch(
        'UpdateDomainRecord',
        {
          RecordId: recordId,
          RR: record,
          Type: type,
          Value: ip,
        },
        { debug: 1 }
      );

      let result = null;
      if (res?.RecordId) {
        logger.info(`[INFO] 更新 ${domain} 的 ${record} 记录成功，值为：${ip}`);
        result = { data: res.RecordId };
      } else {
        logger.info(`[INFO] 更新 ${domain} 的 ${record} 记录失败，信息：${JSON.stringify(res)}`);
        result = { error: res };
      }

      return result;
    } catch (err) {
      // 调用阿里云API进行更新出错时，@alicloud/pop-core 将返回数据放到了 err.data 中
      logger.info(`[ERROR] 更新 ${domain} 的 ${subdomain} 记录返回错误，错误信息：${err.message}`);
      return err.data;
    }
  }

  async update(options: IDDNSUpdateOptions) {
    const { domain, record, type = 'A', ip } = options;
    let result = null;

    try {
      const { recordId, error } = await this.getRecordId(options);
      let data = null;

      if (recordId) {
        const params = { recordId, ...options };
        const { data: updateRes, error } = await this.updateRecord(params);
        data = error || updateRes;
      } else if (recordId === 0) {
        const { data: addRes, error } = await this.addRecord(options);
        data = error || addRes;
      } else {
        data = error;
      }

      result = { code: 0, message: '操作完成', data };
    } catch (e) {
      logger.error(`更新 ${domain} 的 ${record} 的 ${type} 记录出现未知错误，错误信息：${e.message}, 堆栈：${e.stack}`);
      result = { code: CODES.UNKNOWN_ERROR, message: '请求错误', data: e?.data };
    }

    return result;
  }
}
