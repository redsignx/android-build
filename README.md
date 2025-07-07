# 项目概述

这是一个 用于进行 Android 构建的 Github Action

这个 Action 在运行之前已经安装的构建所需要的软件，例如 Java，Gradle，因此无需重复安装

这个 Action 的目的是进行 Android 项目的构建，具体需求如下


## 具体需求

1. 使用 javascript 进行 action 的开发
2. 我有多个 dimension 的 flavor 需要在构建时指定
3. 我有多个 自定义的 buildType 需要在构建时指定
4. 我需要可以定制最终输出的 APK / AAB 文件路径与文件名
5. 需要可以指定Android构建的目录，即 gradlew 命令的 -p 参数
6. 构建过程中可能涉及到一些逻辑判断，以及可能会运行一些额外的 shell script

