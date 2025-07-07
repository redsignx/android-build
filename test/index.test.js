const { AndroidBuilder } = require('../src/index');
const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs-extra');

// Mock @actions/core
jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('fs-extra');

describe('AndroidBuilder', () => {
  let builder;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock core.getInput
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'project-path': '.',
        'flavors': 'prod,debug',
        'build-type': 'release',
        'output-path': './outputs',
        'output-name': 'test-app',
        'gradle-tasks': 'clean',
        'pre-build-script': 'echo "pre-build"',
        'post-build-script': 'echo "post-build"',
        'gradle-options': '--parallel',
        'output-type': 'apk'
      };
      return inputs[name] || '';
    });
    
    // Mock fs-extra
    fs.pathExists.mockResolvedValue(true);
    fs.readdir.mockResolvedValue([]);
    fs.copy.mockResolvedValue();
    fs.ensureDir.mockResolvedValue();
    
    // Mock exec
    exec.exec.mockResolvedValue(0);
    
    builder = new AndroidBuilder();
  });

  test('should initialize with correct inputs', () => {
    expect(builder.projectPath).toBe('.');
    expect(builder.flavors).toEqual(['prod', 'debug']);
    expect(builder.buildType).toBe('release');
    expect(builder.outputPath).toBe('./outputs');
    expect(builder.outputName).toBe('test-app');
    expect(builder.outputType).toBe('apk');
  });

  test('should construct build task correctly with flavors', () => {
    const task = builder.constructBuildTask();
    expect(task).toBe('assembleProdDebugRelease');
  });

  test('should construct build task correctly without flavors', () => {
    builder.flavors = [];
    const task = builder.constructBuildTask();
    expect(task).toBe('assembleRelease');
  });

  test('should construct bundle task for AAB output', () => {
    builder.outputType = 'aab';
    builder.flavors = [];
    const task = builder.constructBuildTask();
    expect(task).toBe('bundleRelease');
  });

  test('should validate inputs correctly', async () => {
    await expect(builder.validateInputs()).resolves.not.toThrow();
    expect(fs.pathExists).toHaveBeenCalledWith('.');
    expect(fs.pathExists).toHaveBeenCalledWith('gradlew');
    expect(exec.exec).toHaveBeenCalledWith('chmod', ['+x', 'gradlew']);
  });

  test('should throw error if project path does not exist', async () => {
    fs.pathExists.mockImplementation((path) => {
      return path !== '.' ? true : false;
    });

    await expect(builder.validateInputs()).rejects.toThrow(
      'Project path does not exist: .'
    );
  });

  test('should throw error if gradlew does not exist', async () => {
    fs.pathExists.mockImplementation((path) => {
      return path !== 'gradlew' ? true : false;
    });

    await expect(builder.validateInputs()).rejects.toThrow(
      'gradlew not found in project path: .'
    );
  });
});
