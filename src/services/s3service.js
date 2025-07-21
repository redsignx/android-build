const AWS = require('aws-sdk');
const { logger } = require('../utils/logger');

const s3 = new AWS.S3();

/**
 * 上传报告到S3
 * 
 * @param {string} bucket - S3桶名称
 * @param {string} key - S3对象键（路径）
 * @param {object} data - 要上传的报告数据
 * @returns {Promise<Object>} - S3上传结果
 */
async function uploadReport(bucket, key, data) {
  try {
    logger.info(`正在上传报告到 S3: ${bucket}/${key}`);
    
    const params = {
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(data, null, 2), // 美化JSON格式
      ContentType: 'application/json',
      Metadata: {
        'uploaded-date': new Date().toISOString(),
        'content-type': 'test-report'
      }
    };
    
    const result = await s3.putObject(params).promise();
    logger.info(`报告上传成功: ${bucket}/${key}`);
    return result;
  } catch (error) {
    logger.error(`上传报告到S3失败: ${error.message}`);
    throw new Error(`S3上传错误: ${error.message}`);
  }
}

module.exports = {
  uploadReport
};