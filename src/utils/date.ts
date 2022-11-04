import dayjs from 'dayjs';

const date = {
  format(date: Date, fmt: string = 'YYYY-MM-DD hh:mm:ss') {
    // 格式见： https://day.js.org/docs/en/display/format
    return dayjs().format(fmt || 'YYYY-MM-DD hh:mm:ss');
  },

  now(fmt: string = 'YYYY-MM-DD hh:mm:ss') {
    return date.format(new Date(), fmt || 'YYYY-MM-DD hh:mm:ss');
  },
};

export default date;
