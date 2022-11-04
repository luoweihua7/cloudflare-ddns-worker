import Logger from '../utils/logger';
import req from '../utils/request';
import CODES from '../config/code';

import { IDDNSInitOptions, IDDNSUpdateOptions } from '../types';

enum APIS {
  /**
   * 获取记录列表
   */
  List = 'Record.List',

  /**
   * 创建记录
   */
  Create = 'Record.Create',

  /**
   * 更新记录
   */
  Update = 'Record.Ddns',
}

const logger = Logger('DNSPodService');

export default class DNSPodService {
  private baseURL = 'https://dnsapi.cn';

  constructor(options: IDDNSInitOptions) {
    const { id, key } = options;

    if (!id || !key) {
      logger.fatal(`初始化 DNSPodService 失败，参数错误: ${JSON.stringify(options)}`);
      throw new Error(`[DNSPodService] Parameter error, id or key required`);
    }

    this.token = `${id},${key}`;
  }

  async request(url = '', data = {}, options = {}) {
    const initOptions = {
      method: 'POST',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      },
      body: req.stringify({
        login_token: this.token,
        format: 'json',
        type: 'A',
        ...data,
      }),
    };

    logger.debug(`请求参数`, initOptions);

    const response = await fetch(`${this.baseURL}/${url}`, initOptions);
    const json = await response.json();

    logger.debug(`请求${url}`, json);

    return json;
  }

  async getRecordId(options: IDDNSUpdateOptions) {
    const { domain, record, type = 'A' } = options;
    const reqData = {
      domain,
      sub_domain: record,
      record_type: type,
      format: 'json',
    };
    const data = await this.request(APIS.List, reqData);
    const { status = {}, records = [] } = data || {};
    const code = Number(status.code);

    let result = {};

    if (code === 1) {
      const recordId = records?.[0]?.id;
      logger.info(`获取 ${record}.${domain} 的 ${type} 记录成功，记录ID为：${recordId}`);
      result = { recordId };
    } else if (code === 10) {
      logger.info(`获取 ${record}.${domain} 的 ${type} 记录完成，记录不存在`);
      result = { recordId: 0 };
    } else {
      logger.error(`获取 ${record}.${domain} 的 ${type} 记录出错，信息：${JSON.stringify(data)}`);
      result = { error: status };
    }

    return result;
  }

  async addRecord(options: IDDNSUpdateOptions) {
    const { domain, record, type = 'A', ip, ttl = 60 } = options;
    const reqData = {
      domain,
      sub_domain: record,
      record_type: type,
      record_line_id: 0,
      value: ip,
      ttl,
      format: 'json',
    };
    const data = await this.request(APIS.Create, reqData);
    const code = Number(data?.status?.code);
    let result = null;

    if (code === 1) {
      logger.info(`添加 ${domain} 的 ${record} 记录成功，值为：${ip}`);
      result = { data };
    } else {
      logger.error(`添加 ${domain} 的 ${record} 记录失败，信息：${JSON.stringify(data?.status)}`);
      result = { error: data?.status };
    }

    return result;
  }

  async updateRecord(options: IDDNSUpdateOptions) {
    const { recordId, domain, record, type = 'A', ip } = options;
    const reqData = {
      record_id: recordId,
      domain,
      sub_domain: record,
      record_type: type,
      record_line_id: 0,
      value: ip,
      format: 'json',
    };
    const data = await this.request(APIS.Update, reqData);
    const code = Number(data?.status?.code);
    let result = null;

    if (code === 1) {
      logger.info(`更新 ${domain} 的 ${record} 记录成功，值为：${ip}`);
      result = { data };
    } else {
      logger.error(`更新 ${domain} 的 ${record} 记录失败，信息：${JSON.stringify(data?.status)}`);
      result = { error: data?.status };
    }

    return result;
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
      result = { code: CODES.UNKNOW_ERROR, message: '请求错误', data: e?.data };
    }

    return result;
  }
}
