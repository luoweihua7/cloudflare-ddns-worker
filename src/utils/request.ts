import qs from 'qs';

const request = {
  parse(req: Request) {
    const { body: blob = '{}', url: href, method, headers } = req;

    const uri = new URL(href);
    const { pathname, search = '' } = uri;
    const params = qs.parse(search.slice(1)); // 去掉问号
    const body = JSON.parse(blob);

    return {
      pathname,
      params,
      body,
    };
  },

  stringify(data: Record<string, any>) {
    const usp = new URLSearchParams();
    Object.keys(data).forEach((key) => usp.append(key, data[key]));

    return usp.toString();
  },

  getParams(req: Request) {
    const { pathname, params, body } = request.parse(req);

    return {
      ...params,
      ...body,
    };
  },

  getParam(req: Request, key: string) {
    const params = request.getParams(req);

    return params[key];
  },

  addParams(url: string, params: Record<string, string>) {
    const usp = new URLSearchParams(params);

    return url + (url.includes('?') ? '&' : '?') + usp.toString();
  },
};

export default request;
