import config from '../config';
import date from './date';

const { level = 'warn' } = config;

enum LoggerType {
  debug = 0,
  info = 1,
  warn = 2,
  error = 3,
  fatal = 4,
}

const tryStringify = (data) => {
  try {
    return JSON.stringify(data);
  } catch (e) {
    return typeof data;
  }
};

class Logger {
  constructor(name: string, level?: string) {
    this.name = name;
    this.level = level || 'info';

    const types = ['debug', 'info', 'warn', 'error', 'fatal'];

    types.forEach((type) => {
      this[type] = (...args) => {
        this.log.apply(this, [type, ...args]);
      };
    });
  }

  log(level = 'info', ...args) {
    if (LoggerType[this.level] <= LoggerType[level]) {
      const { level, name } = this;

      const plainArgs = args.map((arg) => {
        const type = typeof arg;

        if (['number', 'string'].includes(type)) {
          return arg;
        }

        return tryStringify(arg);
      });

      const output = `[${date.now()}] [${level.toUpperCase()}] [${name}] ${plainArgs.join(' | ')}`;
      console.log(output);
    }
  }
}

export default (name: string) => {
  return new Logger(name, level);
};
