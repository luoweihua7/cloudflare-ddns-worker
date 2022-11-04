import DDNSController from './controller/DDNSController';
import utils from './utils';
import CODES from './config/code';

const logger = utils.logger('Index');

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname = '', params = {} } = utils.request.parse(request);
    const [type] = pathname.split('/').filter((_) => _); // 兼容一下无聊多写几个斜杠的情况
    const { debug } = params;

    try {
      const controller = new DDNSController(type, request);
      const result = await controller.update();
      logger.info(`result`, result);

      const { code } = result || {};

      // 不对外暴露未知的错误，防止一些代码没处理好导致隐私问题
      if (String(debug) !== '1' && CODES[code]) {
        const content = JSON.stringify({ code, message: '更新失败' });
        return new Response(content);
      }

      const content = JSON.stringify(result);
      return new Response(content);
    } catch (e) {
      if (String(debug) === '1') {
        return new Response(e.message);
      }

      return new Response('', { status: 404 });
    }
  },
};
