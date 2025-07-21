/**
 * 报告未准备好错误
 */
class ReportNotReadyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReportNotReadyError';
    this.retryable = true;
  }
}

/**
 * 服务错误
 */
class ServiceError extends Error {
  constructor(message, retryable = false) {
    super(message);
    this.name = 'ServiceError';
    this.retryable = retryable;
  }
}

/**
 * 判断错误是否可重试
 * 
 * @param {Error} error - 错误对象
 * @returns {boolean} - 是否可重试
 */
function isRetryableError(error) {
  // 检查自定义错误的重试标志
  if (error.retryable !== undefined) {
    return error.retryable;
  }
  
  // 网络相关错误通常可以重试
  const networkErrors = [
    'ECONNRESET',
    'ECONNABORTED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN'
  ];
  
  if (error.code && networkErrors.includes(error.code)) {
    return true;
  }
  
  // 检查错误消息中的关键词
  const retryablePatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /temporary/i,
    /throttl/i,
    /limit/i,
    /capacity/i,
    /overload/i
  ];
  
  return retryablePatterns.some(pattern => pattern.test(error.message));
}

module.exports = {
  ReportNotReadyError,
  ServiceError,
  isRetryableError
};