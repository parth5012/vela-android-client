import { parseMessage } from '../utils/messageParser';

describe('messageParser', () => {
  it('should parse standard text without any tags', () => {
    const text = 'Hello world, this is a plain text.';
    const result = parseMessage(text);
    expect(result).toEqual([
      { type: 'text', content: 'Hello world, this is a plain text.', isClosed: true }
    ]);
  });

  it('should parse closed thought block', () => {
    const text = '<thought>Thinking about rendering...</thought>Ready to display.';
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'thought',
        isClosed: true,
        children: [
          { type: 'text', content: 'Thinking about rendering...', isClosed: true }
        ]
      },
      { type: 'text', content: 'Ready to display.', isClosed: true }
    ]);
  });

  it('should parse incomplete/streaming thought block', () => {
    const text = '<thought>Currently thinking about the next step';
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'thought',
        isClosed: false,
        children: [
          { type: 'text', content: 'Currently thinking about the next step', isClosed: true }
        ]
      }
    ]);
  });

  it('should parse tool call block with input', () => {
    const text = 'Running command:\n<call:default_api:run_command input="{\\"CommandLine\\":\\"ls -la\\"}">file1.txt\nfile2.txt</call:default_api:run_command>\nExecution done.';
    const result = parseMessage(text);
    expect(result).toEqual([
      { type: 'text', content: 'Running command:\n', isClosed: true },
      {
        type: 'tool_call',
        name: 'default_api:run_command',
        input: '{\\"CommandLine\\":\\"ls -la\\"}',
        isClosed: true,
        children: [
          { type: 'text', content: 'file1.txt\nfile2.txt', isClosed: true }
        ]
      },
      { type: 'text', content: '\nExecution done.', isClosed: true }
    ]);
  });

  it('should parse tool call with single-quoted input', () => {
    const text = `<call:default_api:view_file input='{"AbsolutePath":"/test.txt"}'>hello</call:default_api:view_file>`;
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'tool_call',
        name: 'default_api:view_file',
        input: '{"AbsolutePath":"/test.txt"}',
        isClosed: true,
        children: [
          { type: 'text', content: 'hello', isClosed: true }
        ]
      }
    ]);
  });

  it('should parse incomplete/streaming tool call opening tag', () => {
    const text = '<call:default_api:run_command input="{\\"Command';
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'tool_call',
        name: 'default_api:run_command',
        input: '{\\"Command',
        isClosed: false,
        children: []
      }
    ]);
  });

  it('should parse tool call with open body (streaming content)', () => {
    const text = '<call:default_api:run_command input="{\\"CommandLine\\":\\"pwd\\"}">/users/test/workspace';
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'tool_call',
        name: 'default_api:run_command',
        input: '{\\"CommandLine\\":\\"pwd\\"}',
        isClosed: false,
        children: [
          { type: 'text', content: '/users/test/workspace', isClosed: true }
        ]
      }
    ]);
  });

  it('should handle complex mixed streams containing text, thoughts, and tool calls', () => {
    const text = 'Starting...\n<thought>Thinking 1</thought>Mid text\n<call:toolA input="argsA">outputA</call:toolA>\n<thought>Thinking 2';
    const result = parseMessage(text);
    expect(result).toEqual([
      { type: 'text', content: 'Starting...\n', isClosed: true },
      {
        type: 'thought',
        isClosed: true,
        children: [
          { type: 'text', content: 'Thinking 1', isClosed: true }
        ]
      },
      { type: 'text', content: 'Mid text\n', isClosed: true },
      {
        type: 'tool_call',
        name: 'toolA',
        input: 'argsA',
        isClosed: true,
        children: [
          { type: 'text', content: 'outputA', isClosed: true }
        ]
      },
      { type: 'text', content: '\n', isClosed: true },
      {
        type: 'thought',
        isClosed: false,
        children: [
          { type: 'text', content: 'Thinking 2', isClosed: true }
        ]
      }
    ]);
  });

  it('should handle tool call inputs containing greater than signs', () => {
    const text = '<call:default_api:run_command input="{\\"CommandLine\\":\\"echo 1 > out.txt\\"}">Success</call:default_api:run_command>';
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'tool_call',
        name: 'default_api:run_command',
        input: '{\\"CommandLine\\":\\"echo 1 > out.txt\\"}',
        isClosed: true,
        children: [
          { type: 'text', content: 'Success', isClosed: true }
        ]
      }
    ]);
  });

  it('should parse nested tool calls hierarchically', () => {
    const text = '<call:web_search input="query_1"><call:tavily_search input="query_2">tavily_output</call:tavily_search>web_output</call:web_search>';
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'tool_call',
        name: 'web_search',
        input: 'query_1',
        isClosed: true,
        children: [
          {
            type: 'tool_call',
            name: 'tavily_search',
            input: 'query_2',
            isClosed: true,
            children: [
              { type: 'text', content: 'tavily_output', isClosed: true }
            ]
          },
          { type: 'text', content: 'web_output', isClosed: true }
        ]
      }
    ]);
  });

  it('should parse closed intent block', () => {
    const text = '<intent>Goal is to list files.</intent>Ready.';
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'intent',
        isClosed: true,
        children: [
          { type: 'text', content: 'Goal is to list files.', isClosed: true }
        ]
      },
      { type: 'text', content: 'Ready.', isClosed: true }
    ]);
  });

  it('should parse incomplete/streaming intent block', () => {
    const text = '<intent>Currently parsing intent';
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'intent',
        isClosed: false,
        children: [
          { type: 'text', content: 'Currently parsing intent', isClosed: true }
        ]
      }
    ]);
  });

  it('should parse skill block with input', () => {
    const text = '<skill:custom_search input="{\\"query\\":\\"react\\"}">results</skill:custom_search>';
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'skill',
        name: 'custom_search',
        input: '{\\"query\\":\\"react\\"}',
        isClosed: true,
        children: [
          { type: 'text', content: 'results', isClosed: true }
        ]
      }
    ]);
  });

  it('should parse incomplete/streaming skill block', () => {
    const text = '<skill:custom_search input="{\\"query\\":\\"react\\"}">fetching';
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'skill',
        name: 'custom_search',
        input: '{\\"query\\":\\"react\\"}',
        isClosed: false,
        children: [
          { type: 'text', content: 'fetching', isClosed: true }
        ]
      }
    ]);
  });

  it('should parse closed skill block without input', () => {
    const text = '<skill:custom_search>results</skill:custom_search>';
    const result = parseMessage(text);
    expect(result).toEqual([
      {
        type: 'skill',
        name: 'custom_search',
        isClosed: true,
        children: [
          { type: 'text', content: 'results', isClosed: true }
        ]
      }
    ]);
  });

  it('should handle complex mixed streams containing thoughts, intents, skills, and tool calls', () => {
    const text = 'Starting...\n<intent>Identify user need</intent>\n<thought>Thinking...</thought>\n<skill:search input="query">search_out</skill:search>\n<call:execute>done</call:execute>';
    const result = parseMessage(text);
    expect(result).toEqual([
      { type: 'text', content: 'Starting...\n', isClosed: true },
      {
        type: 'intent',
        isClosed: true,
        children: [{ type: 'text', content: 'Identify user need', isClosed: true }]
      },
      { type: 'text', content: '\n', isClosed: true },
      {
        type: 'thought',
        isClosed: true,
        children: [{ type: 'text', content: 'Thinking...', isClosed: true }]
      },
      { type: 'text', content: '\n', isClosed: true },
      {
        type: 'skill',
        name: 'search',
        input: 'query',
        isClosed: true,
        children: [{ type: 'text', content: 'search_out', isClosed: true }]
      },
      { type: 'text', content: '\n', isClosed: true },
      {
        type: 'tool_call',
        name: 'execute',
        isClosed: true,
        children: [{ type: 'text', content: 'done', isClosed: true }]
      }
    ]);
  });
});

