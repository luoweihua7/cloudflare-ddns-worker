import DNSPodService from '../services/DNSPodService';
import AliyunService from '../services/AliyunService';
import CloudflareService from '../services/CloudflareService';
import request from '../utils/request';
import Logger from '../utils/logger';
import CODES from '../config/code';

import { DDNSTypes, IDDNSInitOptions, IDDNSUpdateOptions } from '../types';

const logger = Logger('DDNSController');

export default class DDNSController {
  constructor(dns: string, request: Request, env: Env) {
    this.dns = dns;
    this.req = request;
    this.env = env;
  }

  async update() {
    const { req, dns } = this;
    const { id, key, domain, record, type = 'A', ip, ttl } = request.getParams(req);

    let initOptions = { id, key } as IDDNSInitOptions;
    let updateOptions = { domain, record, type, ip, ttl } as IDDNSUpdateOptions;
    let DNSProvider = null;

    switch (dns) {
      case DDNSTypes.DNSPod:
        DNSProvider = DNSPodService;
        break;
      case DDNSTypes.Cloudflare:
        DNSProvider = CloudflareService;
        break;
      case DDNSTypes.Aliyun:
        DNSProvider = AliyunService;
        break;
      default:
        break;
    }

    let result = { code: CODES.UNSUPPORTED_TYPE, error: `不支持的DDNS类型，当前仅支持 ${Object.values(DDNSTypes)}` };

    if (DNSProvider !== null) {
      const service = new DNSProvider(initOptions);
      result = await service.update(updateOptions);
    } else {
      logger.error(`无法更新，不支持的DDNS类型 "${dns}"`);
    }

    return result;
  }
}
