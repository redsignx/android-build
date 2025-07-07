# 快速开始指南

## 1. 基本使用

在你的GitHub Actions工作流中使用这个Action：

```yaml
name: Build Android App

on:
  push:
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
    
    - name: Build Android App
      uses: your-username/android-build-action@v1
      with:
        project-path: '.'
        flavors: 'prod,release'
        build-type: 'release'
```

## 2. 高级配置

### 2.1 多Flavor构建

如果你的Android项目有多个flavor dimensions：

```yaml
- name: Build Multi-Flavor App
  uses: your-username/android-build-action@v1
  with:
    project-path: './android'
    flavors: 'prod,paid'  # 构建 prodPaid 变体
    build-type: 'release'
    output-path: './build-outputs'
    output-name: 'MyApp-ProdPaid'
```

### 2.2 自定义Build Type

```yaml
- name: Build with Custom Build Type
  uses: your-username/android-build-action@v1
  with:
    project-path: './android'
    build-type: 'staging'  # 使用自定义的staging构建类型
    output-type: 'aab'     # 输出AAB格式
```

### 2.3 使用构建脚本

```yaml
- name: Build with Pre/Post Scripts
  uses: your-username/android-build-action@v1
  with:
    project-path: './android'
    flavors: 'prod,debug'
    build-type: 'release'
    pre-build-script: |
      echo "准备构建..."
      ./prepare-build.sh
      echo "BUILD_TIME=$(date)" >> gradle.properties
    post-build-script: |
      echo "构建完成!"
      ./post-build.sh
      # 上传到测试平台
      ./upload-to-test-platform.sh
```

## 3. 完整示例

```yaml
name: Android CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Setup Java
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Setup Android SDK
      uses: android-actions/setup-android@v3
    
    - name: Run Tests
      run: ./gradlew test

  build:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        flavor: ['prod', 'debug']
        build-type: ['release', 'debug']
    
    steps:
    - name: Checkout
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
        project-path: '.'
        flavors: ${{ matrix.flavor }}
        build-type: ${{ matrix.build-type }}
        output-path: './outputs'
        output-name: 'MyApp-${{ matrix.flavor }}-${{ matrix.build-type }}-${{ github.run_number }}'
        gradle-tasks: 'clean,lint'
        gradle-options: '--parallel --daemon'
        pre-build-script: |
          echo "构建 ${{ matrix.flavor }} ${{ matrix.build-type }} 变体"
          echo "BUILD_NUMBER=${{ github.run_number }}" >> gradle.properties
          echo "GIT_COMMIT=${{ github.sha }}" >> gradle.properties
        post-build-script: |
          echo "构建完成: ${{ steps.build.outputs.output-file }}"
          ls -la outputs/
    
    - name: Upload Build Artifacts
      uses: actions/upload-artifact@v3
      with:
        name: android-${{ matrix.flavor }}-${{ matrix.build-type }}
        path: outputs/
    
    - name: Deploy to Test Environment
      if: github.ref == 'refs/heads/develop'
      run: |
        echo "部署到测试环境..."
        # 这里可以添加部署逻辑
```

## 4. 故障排除

### 4.1 常见错误

**错误**: `gradlew not found in project path`
**解决方案**: 确保你的项目根目录包含 `gradlew` 文件，或者正确设置 `project-path` 参数。

**错误**: `Build task failed`
**解决方案**: 检查你的 `flavors` 和 `build-type` 配置是否与你的 `build.gradle` 文件中定义的一致。

### 4.2 调试技巧

1. **启用详细日志**：
   ```yaml
   - name: Build with Debug
     uses: your-username/android-build-action@v1
     with:
       gradle-options: '--info --stacktrace'
   ```

2. **检查输出**：
   ```yaml
   - name: Debug Build Output
     run: |
       echo "Build outputs: ${{ steps.build.outputs.output-files }}"
       echo "Build log: ${{ steps.build.outputs.build-log }}"
   ```

## 5. 最佳实践

1. **使用缓存**：始终缓存Gradle依赖以提高构建速度
2. **并行构建**：使用 `--parallel` 选项加速构建
3. **分离环境**：使用不同的flavors区分开发、测试和生产环境
4. **版本控制**：在构建脚本中包含版本信息
5. **安全性**：使用GitHub Secrets存储敏感信息（如签名密钥）

## 6. 参数参考

请参阅 [README.md](../README.md) 中的完整参数列表。
