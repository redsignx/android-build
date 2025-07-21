const axios = require('axios');
const { logger } = require('../utils/logger');
const { ReportNotReadyError, ServiceError } = require('../utils/errors');

// API配置
const TEST_SERVICE_API = process.env.TEST_SERVICE_API;
const API_TIMEOUT = 30000; // 30秒

// 创建API客户端
const apiClient = axios.create({
  baseURL: TEST_SERVICE_API,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * 从测试服务API获取测试报告
 * 
 * @param {string} testId - 测试ID
 * @returns {Promise<Object>} - 测试报告对象
 * @throws {Error} 当API调用失败时
 */
async function getTestReport(testId) {
  try {
    logger.info(`正在获取测试报告, ID: ${testId}`);
    
    const response = await apiClient.get(`/reports/${testId}`, {
      validateStatus: status => status === 200 // 只接受200状态码
    });
    
    logger.debug(`成功获取测试报告: ${testId}`);
    
    // 检查报告是否完成
    if (response.data.status === 'in_progress') {
      logger.info(`测试 ${testId} 仍在进行中`);
      return { completed: false };
    } else if (response.data.status === 'failed') {
      logger.error(`测试 ${testId} 失败: ${response.data.error || '未知错误'}`);
      throw new ServiceError(`测试执行失败: ${response.data.error || '未知错误'}`);
    } else if (response.data.status === 'completed') {
      logger.info(`测试 ${testId} 已完成`);
      return {
        completed: true,
        ...response.data
      };
    } else {
      logger.warn(`测试 ${testId} 状态未知: ${response.data.status}`);
      throw new ReportNotReadyError(`测试状态未知: ${response.data.status}`);
    }
  } catch (error) {
    // 处理Axios错误
    if (error.response) {
      // 服务器响应了，但状态码不是2xx
      if (error.response.status === 404) {
        logger.warn(`测试报告不存在或尚未生成: ${testId}`);
        return { completed: false };
      } else if (error.response.status === 429) {
        logger.warn(`API限流，测试ID: ${testId}`);
        throw new ServiceError('API请求过于频繁，被限流', true); // 可重试
      } else if (error.response.status >= 500) {
        logger.error(`测试服务器错误: ${error.response.status}, 测试ID: ${testId}`);
        throw new ServiceError(`服务器错误 (${error.response.status})`, true); // 可重试
      } else {
        logger.error(`API请求失败: ${error.response.status}, 测试ID: ${testId}`);
        throw new ServiceError(`API错误 (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      logger.error(`API无响应，测试ID: ${testId}`);
      throw new ServiceError('API请求超时或无响应', true); // 可重试
    } else if (error instanceof ReportNotReadyError || error instanceof ServiceError) {
      // 自定义错误，直接抛出
      throw error;
    } else {
      // 设置请求时出现问题
      logger.error(`请求测试报告时出现错误: ${error.message}`);
      throw new ServiceError(`请求错误: ${error.message}`);
    }
  }
}

module.exports = {
  getTestReport
};