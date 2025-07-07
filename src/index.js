const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs-extra');
const path = require('path');

class AndroidBuilder {
  constructor() {
    this.projectPath = core.getInput('project-path') || '.';
    this.flavors = core.getInput('flavors').split(',').filter(f => f.trim());
    this.buildType = core.getInput('build-type') || 'release';
    this.outputPath = core.getInput('output-path');
    this.outputName = core.getInput('output-name');
    this.gradleTasks = core.getInput('gradle-tasks').split(',').filter(t => t.trim());
    this.preBuildScript = core.getInput('pre-build-script');
    this.postBuildScript = core.getInput('post-build-script');
    this.gradleOptions = core.getInput('gradle-options');
    this.outputType = core.getInput('output-type') || 'apk';
    
    this.buildLog = [];
  }

  async run() {
    try {
      core.info('🚀 Starting Android Build Action...');
      
      // Validate inputs
      await this.validateInputs();
      
      // Run pre-build script if provided
      if (this.preBuildScript) {
        await this.runScript(this.preBuildScript, 'Pre-build script');
      }
      
      // Build the project
      await this.buildProject();
      
      // Handle output files
      const outputFiles = await this.handleOutputFiles();
      
      // Run post-build script if provided
      if (this.postBuildScript) {
        await this.runScript(this.postBuildScript, 'Post-build script');
      }
      
      // Set outputs
      core.setOutput('output-files', JSON.stringify(outputFiles));
      if (outputFiles.length > 0) {
        core.setOutput('output-file', outputFiles[0]);
      }
      core.setOutput('build-log', this.buildLog.join('\n'));
      
      core.info('✅ Android build completed successfully!');
      
    } catch (error) {
      core.setFailed(`❌ Build failed: ${error.message}`);
      throw error;
    }
  }

  async validateInputs() {
    // Check if project path exists
    if (!await fs.pathExists(this.projectPath)) {
      throw new Error(`Project path does not exist: ${this.projectPath}`);
    }

    // Check if gradlew exists
    const gradlewPath = path.join(this.projectPath, 'gradlew');
    if (!await fs.pathExists(gradlewPath)) {
      throw new Error(`gradlew not found in project path: ${this.projectPath}`);
    }

    // Make gradlew executable
    await exec.exec('chmod', ['+x', gradlewPath]);
    
    core.info(`✅ Project validation completed for: ${this.projectPath}`);
  }

  async runScript(script, scriptName) {
    core.info(`📜 Running ${scriptName}...`);
    
    const scriptLines = script.split('\n').filter(line => line.trim());
    
    for (const line of scriptLines) {
      if (line.trim()) {
        core.info(`Executing: ${line}`);
        await exec.exec('bash', ['-c', line], {
          cwd: this.projectPath
        });
      }
    }
    
    core.info(`✅ ${scriptName} completed`);
  }

  async buildProject() {
    core.info('🔨 Building Android project...');
    
    const gradlewPath = path.join(this.projectPath, 'gradlew');
    const buildArgs = ['-p', this.projectPath];
    
    // Add gradle options if provided
    if (this.gradleOptions) {
      buildArgs.push(...this.gradleOptions.split(' ').filter(opt => opt.trim()));
    }
    
    // Add additional gradle tasks
    if (this.gradleTasks.length > 0) {
      buildArgs.push(...this.gradleTasks);
    }
    
    // Build the main task
    const buildTask = this.constructBuildTask();
    buildArgs.push(buildTask);
    
    core.info(`Executing: ${gradlewPath} ${buildArgs.join(' ')}`);
    
    let buildOutput = '';
    const options = {
      listeners: {
        stdout: (data) => {
          buildOutput += data.toString();
          this.buildLog.push(data.toString());
        },
        stderr: (data) => {
          buildOutput += data.toString();
          this.buildLog.push(data.toString());
        }
      }
    };
    
    await exec.exec(gradlewPath, buildArgs, options);
    
    core.info('✅ Build completed successfully');
  }

  constructBuildTask() {
    let task = '';
    
    if (this.flavors.length > 0) {
      // If flavors are specified, combine them with build type
      // Capitalize each flavor properly
      const flavorCombination = this.flavors.map(f => 
        f.charAt(0).toUpperCase() + f.slice(1).toLowerCase()
      ).join('');
      const buildTypeCapitalized = this.buildType.charAt(0).toUpperCase() + this.buildType.slice(1);
      task = `assemble${flavorCombination}${buildTypeCapitalized}`;
    } else {
      // No flavors, just build type
      const buildTypeCapitalized = this.buildType.charAt(0).toUpperCase() + this.buildType.slice(1);
      if (this.outputType === 'aab') {
        task = `bundle${buildTypeCapitalized}`;
      } else {
        task = `assemble${buildTypeCapitalized}`;
      }
    }
    
    core.info(`🎯 Build task: ${task}`);
    return task;
  }

  async handleOutputFiles() {
    core.info('📁 Handling output files...');
    
    const outputFiles = [];
    const buildOutputDir = path.join(this.projectPath, 'app', 'build', 'outputs');
    
    // Find APK/AAB files
    const searchDirs = this.outputType === 'aab' ? 
      [path.join(buildOutputDir, 'bundle')] : 
      [path.join(buildOutputDir, 'apk')];
    
    for (const searchDir of searchDirs) {
      if (await fs.pathExists(searchDir)) {
        const files = await this.findOutputFiles(searchDir);
        outputFiles.push(...files);
      }
    }
    
    // Copy and rename files if custom output path/name is specified
    if (this.outputPath || this.outputName) {
      const processedFiles = await this.processOutputFiles(outputFiles);
      return processedFiles;
    }
    
    core.info(`📱 Found ${outputFiles.length} output file(s)`);
    outputFiles.forEach(file => core.info(`  - ${file}`));
    
    return outputFiles;
  }

  async findOutputFiles(dir) {
    const files = [];
    const extension = this.outputType === 'aab' ? '.aab' : '.apk';
    
    const walk = async (currentDir) => {
      const items = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        
        if (item.isDirectory()) {
          await walk(fullPath);
        } else if (item.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    };
    
    if (await fs.pathExists(dir)) {
      await walk(dir);
    }
    
    return files;
  }

  async processOutputFiles(files) {
    const processedFiles = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = path.extname(file);
      
      let outputDir = this.outputPath || path.dirname(file);
      let outputName = this.outputName || path.basename(file, extension);
      
      // If multiple files and custom name, append index
      if (files.length > 1 && this.outputName) {
        outputName = `${this.outputName}-${i + 1}`;
      }
      
      const outputFile = path.join(outputDir, `${outputName}${extension}`);
      
      // Ensure output directory exists
      await fs.ensureDir(path.dirname(outputFile));
      
      // Copy file to new location
      await fs.copy(file, outputFile);
      
      processedFiles.push(outputFile);
      core.info(`📁 Copied: ${file} -> ${outputFile}`);
    }
    
    return processedFiles;
  }
}

// Main execution
async function main() {
  const builder = new AndroidBuilder();
  await builder.run();
}

// Run the action
if (require.main === module) {
  main().catch(error => {
    core.setFailed(error.message);
    process.exit(1);
  });
}

module.exports = { AndroidBuilder };
