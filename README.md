# App测试报告处理系统

基于AWS SQS和Lambda的App测试报告自动处理系统，用于高效处理每小时500-1000次的App测试报告。

## 系统架构

系统使用以下AWS服务构建:

- **Amazon SQS FIFO Queue**: 确保消息只处理一次
- **AWS Lambda**: 无服务器处理测试报告
- **Amazon S3**: 存储处理后的测试报告
- **Amazon CloudWatch**: 监控和告警

## 功能特点

- 从第三方API获取测试报告
- 智能重试机制，处理未完成的测试
- 精确一次处理保证，避免重复处理
- 可配置的重试策略和最大重试次数
- 完善的错误处理和死信队列
- 详细的日志和监控指标

## 部署说明

### 前提条件

- Node.js 14+
- AWS CLI 已配置
- Serverless Framework

### 部署步骤

1. 安装依赖:

```bash
npm install
```

2. 部署到开发环境:

```bash
npm run deploy
```

3. 部署到生产环境:

```bash
npm run deploy:prod
```

### 配置参数

可以通过参数自定义以下配置:

```bash
# 自定义区域
serverless deploy --region eu-west-1

# 自定义第三方API地址
serverless deploy --param="testServiceApi=https://your-api-url.com"

# 自定义S3桶名称
serverless deploy --param="reportsBucket=your-custom-bucket-name"

# 自定义日志级别
serverless deploy --param="logLevel=debug"
```

## 消息处理流程

1. Jenkins Pipeline构建App并发送到第三方测试服务
2. 测试任务信息发送到SQS FIFO队列，带30分钟延迟
3. Lambda函数被触发尝试获取测试报告
4. 如果报告未就绪，重新排队消息并增加15分钟延迟
5. 成功获取报告后，处理并上传到S3

## 监控和故障排除

- 查看Lambda日志:
```bash
npm run logs
```

- CloudWatch指标:
  - MessagesReceived: 接收到的消息数
  - ReportsUploaded: 成功上传的报告数
  - MessagesRequeued: 重新排队的消息数
  - ProcessingErrors: 处理错误数
  - MaxRetriesExceeded: 超过最大重试次数的消息
  - PermanentFailures: 永久性失败的消息

## 开发者说明

### 项目结构

```
app-test-report-processor/
├── serverless.yml   # Serverless配置
├── src/
│   ├── handlers/    # Lambda处理函数
│   ├── services/    # 业务服务
│   └── utils/       # 工具函数
```

### 本地测试

```bash
npm start
```

## 许可证

[MIT](LICENSE)