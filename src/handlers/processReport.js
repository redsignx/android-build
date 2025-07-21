const AWS = require('aws-sdk');
const { getTestReport } = require('../services/reportService');
const { uploadReport } = require('../services/s3Service');
const { logger } = require('../utils/logger');
const { isRetryableError } = require('../utils/errors');

const sqs = new AWS.SQS();
const cloudwatch = new AWS.CloudWatch();

// 环境变量
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const REPORTS_BUCKET = process.env.REPORTS_BUCKET;
const RETRY_DELAY_SECONDS = parseInt(process.env.RETRY_DELAY_SECONDS, 10) || 900; // 默认15分钟
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES, 10) || 5;

/**
 * Lambda 处理程序 - 处理测试报告
 */
exports.handler = async (event) => {
  if (!event.Records || event.Records.length === 0) {
    logger.info('No records to process');
    return { statusCode: 200, body: 'No records to process' };
  }

  // 记录指标 - 收到消息
  await putMetric('MessagesReceived', event.Records.length, 'Count');
  
  // 处理消息
  for (const record of event.Records) {
    const { body, receiptHandle, messageId } = record;
    
    try {
      logger.debug(`Processing message ${messageId}`);
      const messageData = JSON.parse(body);
      
      // 从消息中提取数据
      const { testId, buildNumber, jobName, timestamp, retryCount = 0 } = messageData;
      logger.info(`处理测试ID: ${testId}, 构建编号: ${buildNumber}, 重试次数: ${retryCount}`);
      
      // 从第三方API获取测试报告
      const testReport = await getTestReport(testId);
      
      // 检查报告是否已完成
      if (!testReport.completed) {
        logger.info(`测试报告尚未完成，安排重试。测试ID: ${testId}`);
        
        if (retryCount >= MAX_RETRIES) {
          logger.error(`测试报告获取失败，超过最大重试次数: ${testId}`);
          await putMetric('MaxRetriesExceeded', 1, 'Count');
          await deleteMessage(receiptHandle);
          continue;
        }
        
        // 重新排队消息，增加延迟
        await requeueMessage({
          testId,
          buildNumber,
          jobName,
          timestamp,
          retryCount: retryCount + 1
        }, receiptHandle);
        
        continue;
      }
      
      // 处理测试报告
      logger.info(`处理测试报告: ${testId}`);
      const processedReport = processReport(testReport);
      
      // 生成S3存储路径
      const s3Key = `reports/${jobName}/${buildNumber}/${testId}.json`;
      
      // 上传报告到S3
      await uploadReport(REPORTS_BUCKET, s3Key, processedReport);
      
      // 记录成功指标
      await putMetric('ReportsUploaded', 1, 'Count');
      
      // 处理完成，从队列删除消息
      await deleteMessage(receiptHandle);
      
      logger.info(`测试报告处理成功: ${testId}, 存储在 ${s3Key}`);
      
    } catch (error) {
      logger.error('处理消息时出错:', error);
      await putMetric('ProcessingErrors', 1, 'Count');
      
      try {
        const messageData = JSON.parse(body);
        const { retryCount = 0 } = messageData;
        
        // 判断是否是可重试的错误，且未超过最大重试次数
        if (isRetryableError(error) && retryCount < MAX_RETRIES) {
          logger.info(`可重试的错误，安排重试。重试次数: ${retryCount + 1}`);
          await requeueMessage({
            ...messageData,
            retryCount: retryCount + 1
          }, receiptHandle);
        } else {
          // 达到最大重试次数或不可重试的错误，消息将转到DLQ
          logger.error(`处理失败，不再重试。原因: ${error.message}`);
          await putMetric('PermanentFailures', 1, 'Count');
          // 不删除消息，让它自然进入DLQ
        }
      } catch (requeueError) {
        logger.error('尝试重新排队消息时出错:', requeueError);
        // 这里不删除消息，让SQS自己处理可见性超时和重试
      }
    }
  }
  
  return { statusCode: 200, body: 'Processing completed' };
};

/**
 * 处理测试报告数据
 */
function processReport(report) {
  // 这里是实际的报告处理逻辑，可根据需要定制
  const processed = {
    summary: {
      totalTests: report.tests?.length || 0,
      passedTests: report.tests?.filter(t => t.status === 'PASS').length || 0,
      failedTests: report.tests?.filter(t => t.status === 'FAIL').length || 0,
      duration: report.duration,
      device: report.deviceInfo
    },
    details: report.tests,
    metadata: {
      processedAt: new Date().toISOString(),
      processedBy: 'test-report-processor'
    },
    rawData: report  // 保留原始报告数据
  };
  
  return processed;
}

/**
 * 重新排队消息，添加延迟
 */
async function requeueMessage(messageBody, receiptHandle) {
  const timestamp = new Date().getTime();
  const deduplicationId = `${messageBody.testId}-${timestamp}-retry${messageBody.retryCount}`;
  
  try {
    // 发送新消息到队列
    await sqs.sendMessage({
      QueueUrl: SQS_QUEUE_URL,
      MessageBody: JSON.stringify(messageBody),
      MessageDeduplicationId: deduplicationId,
      MessageGroupId: messageBody.testId,  // 使用testId作为消息组ID
      DelaySeconds: RETRY_DELAY_SECONDS
    }).promise();
    
    // 从队列中删除当前消息
    await deleteMessage(receiptHandle);
    
    await putMetric('MessagesRequeued', 1, 'Count');
    logger.info(`消息已重新入队，延迟 ${RETRY_DELAY_SECONDS} 秒，去重ID: ${deduplicationId}`);
  } catch (error) {
    logger.error(`重新排队消息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 从SQS删除消息
 */
async function deleteMessage(receiptHandle) {
  try {
    await sqs.deleteMessage({
      QueueUrl: SQS_QUEUE_URL,
      ReceiptHandle: receiptHandle
    }).promise();
    logger.debug('消息已从队列中删除');
  } catch (error) {
    logger.error(`删除消息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 发送CloudWatch指标
 */
async function putMetric(metricName, value, unit) {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'TestReportProcessor',
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date()
        }
      ]
    }).promise();
    logger.debug(`已记录指标 ${metricName}: ${value} ${unit}`);
  } catch (error) {
    logger.error(`记录指标失败 ${metricName}: ${error.message}`);
    // 不抛出异常，避免因指标记录失败影响主要流程
  }
}