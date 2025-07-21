/**
 * 简单的日志记录器
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// 从环境变量获取日志级别
const currentLevel = process.env.LOG_LEVEL || 'info';
const currentLevelValue = LOG_LEVELS[currentLevel.toLowerCase()] || LOG_LEVELS.info;

/**
 * 创建带时间戳和级别的格式化日志消息
 */
function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  let formattedMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;
  
  // 处理额外参数
  if (args.length > 0) {
    args.forEach(arg => {
      if (typeof arg === 'object') {
        try {
          formattedMessage += ' ' + JSON.stringify(arg);
        } catch (e) {
          formattedMessage += ' [Object]';
        }
      } else {
        formattedMessage += ' ' + arg;
      }
    });
  }
  
  return formattedMessage;
}

const logger = {
  error: (message, ...args) => {
    if (currentLevelValue >= LOG_LEVELS.error) {
      console.error(formatMessage('error', message, ...args));
    }
  },
  warn: (message, ...args) => {
    if (currentLevelValue >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message, ...args));
    }
  },
  info: (message, ...args) => {
    if (currentLevelValue >= LOG_LEVELS.info) {
      console.info(formatMessage('info', message, ...args));
    }
  },
  debug: (message, ...args) => {
    if (currentLevelValue >= LOG_LEVELS.debug) {
      console.debug(formatMessage('debug', message, ...args));
    }
  }
};

module.exports = { logger };