# Android Build Action

这是一个用于进行Android构建的GitHub Action，支持多种flavors、自定义build types、自定义输出路径等功能。

## 功能特性

✅ **多Flavor支持** - 支持多个dimension的flavor组合构建  
✅ **自定义Build Type** - 支持自定义buildType（release、debug或自定义类型）  
✅ **灵活输出控制** - 可定制APK/AAB输出路径和文件名  
✅ **项目路径指定** - 支持指定Android项目目录（gradlew -p参数）  
✅ **脚本扩展** - 支持构建前后执行自定义shell脚本  
✅ **JavaScript实现** - 使用JavaScript/Node.js开发，运行快速稳定  

## 使用方法

### 基本用法

```yaml
- name: Build Android App
  uses: your-username/android-build-action@v1
  with:
    project-path: './android'
    flavors: 'prod,release'
    build-type: 'release'
    output-path: './build-outputs'
    output-name: 'MyApp'
```

### 高级用法

```yaml
- name: Build Android App with Scripts
  uses: your-username/android-build-action@v1
  with:
    project-path: './android'
    flavors: 'prod,debug'
    build-type: 'release'
    output-path: './artifacts'
    output-name: 'MyApp-v${{ github.run_number }}'
    output-type: 'apk'
    gradle-tasks: 'clean,test'
    gradle-options: '--parallel --daemon'
    pre-build-script: |
      echo "Starting build process..."
      echo "BUILD_NUMBER=${{ github.run_number }}" >> version.properties
      ./scripts/prepare-build.sh
    post-build-script: |
      echo "Build completed!"
      ./scripts/post-build.sh
      ls -la artifacts/
```

## 输入参数

| 参数                | 描述                                | 必需 | 默认值    |
| ------------------- | ----------------------------------- | ---- | --------- |
| `project-path`      | Android项目目录路径                 | 否   | `.`       |
| `flavors`           | 构建的flavor列表，用逗号分隔        | 否   | `''`      |
| `build-type`        | 构建类型 (release, debug, 或自定义) | 否   | `release` |
| `output-path`       | 输出APK/AAB文件的自定义路径         | 否   | `''`      |
| `output-name`       | 输出文件的自定义名称                | 否   | `''`      |
| `output-type`       | 输出类型: `apk` 或 `aab`            | 否   | `apk`     |
| `gradle-tasks`      | 额外的gradle任务，用逗号分隔        | 否   | `''`      |
| `gradle-options`    | 额外的gradle选项                    | 否   | `''`      |
| `pre-build-script`  | 构建前执行的shell脚本               | 否   | `''`      |
| `post-build-script` | 构建后执行的shell脚本               | 否   | `''`      |

## 输出参数

| 参数           | 描述                                  |
| -------------- | ------------------------------------- |
| `output-file`  | 生成的第一个APK/AAB文件路径           |
| `output-files` | 所有生成的APK/AAB文件路径（JSON数组） |
| `build-log`    | 构建过程的日志输出                    |

## 完整示例

```yaml
name: Android CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Java
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Setup Android SDK
      uses: android-actions/setup-android@v3
    
    - name: Cache Gradle dependencies
      uses: actions/cache@v3
      with:
        path: |
          ~/.gradle/caches
          ~/.gradle/wrapper
        key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*') }}
    
    - name: Build Android App
      id: build
      uses: your-username/android-build-action@v1
      with:
        project-path: './android'
        flavors: 'prod,debug'
        build-type: 'release'
        output-path: './build-outputs'
        output-name: 'MyApp-${{ github.run_number }}'
        gradle-tasks: 'clean,testDebugUnitTest'
        pre-build-script: |
          echo "BUILD_NUMBER=${{ github.run_number }}" >> version.properties
          echo "BUILD_TIME=$(date)" >> version.properties
        post-build-script: |
          echo "Build completed successfully!"
          echo "Generated files:"
          ls -la build-outputs/
    
    - name: Upload Build Artifacts
      uses: actions/upload-artifact@v3
      with:
        name: android-build-${{ github.run_number }}
        path: build-outputs/
    
    - name: Display Build Results
      run: |
        echo "Build Output Files: ${{ steps.build.outputs.output-files }}"
        echo "Primary Output: ${{ steps.build.outputs.output-file }}"
```

## 开发和贡献

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-username/android-build-action.git
cd android-build-action

# 安装依赖
npm install

# 运行测试
npm test

# 代码检查
npm run lint

# 构建
npm run package
```

### 项目结构

```
android-build-action/
├── src/
│   └── index.js          # 主要的构建逻辑
├── test/
│   └── index.test.js     # 测试文件
├── .github/
│   └── workflows/        # GitHub Actions工作流
├── dist/                 # 构建输出目录
├── action.yml            # Action定义文件
├── package.json          # Node.js依赖配置
└── README.md             # 文档
```

## 技术实现

- **JavaScript/Node.js** - 主要开发语言
- **@actions/core** - GitHub Actions核心库
- **@actions/exec** - 命令执行库
- **fs-extra** - 文件系统操作
- **Jest** - 单元测试框架

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 支持

如果您在使用过程中遇到问题，请：

1. 查看 [Issues](https://github.com/your-username/android-build-action/issues) 页面
2. 创建新的Issue描述您的问题
3. 提供详细的错误信息和复现步骤

## 更新日志

### v1.0.0
- 初始版本发布
- 支持多flavor构建
- 支持自定义build type
- 支持自定义输出路径和文件名
- 支持构建前后脚本执行

