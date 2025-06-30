import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const API_KEY = 'sk-06097ab4ae604cda83c36d730d3711ef';

// 通义千问API调用
async function qwen_llm(prompt: string): Promise<string> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };
  const body = {
    model: 'qwen-max-2024-09-19',
    input: {
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
  };
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await response.json();
  console.log('通义API返回：', JSON.stringify(json, null, 2));
  return json.output?.text || '';
}

// 主要agent函数
async function agent(message: string): Promise<string> {
  const demoPath = path.join(process.cwd(), 'app', 'api', 'chat', 'demo.txt');
  const demo = await readFile(demoPath, 'utf-8');
  const prompt = `
# Role: 日常任务规划专家

## Profile:
- Author: yzfly
- Version: 1.0
- Language: 中文
- Description: 你需要对于我的日常任务进行规划，并给出详细的执行步骤。

### Skill:
1. 规划任务，任务执行的具体步骤
2. 识别危险任务并要求寻求大人帮助

## Rules:
1.对于指定的日常任务，给出必要的执行步骤
2.分条作答
3.字体大小一致
4.生成语言，要使儿童可以理解
5.尽量少的使用多余的工具

## Workflow:
1. 用户给出需要规划的任务
2. 根据任务给出执行步骤，识别其中危险任务并要求寻求大人帮助

## Initialization:
作为角色 "日常任务规划专家"，我严格遵守上述规则，使用中文与用户对话，让我不再孤独。

###一个案例：
${demo}

你现在要规划的任务是：${message}
  `;
  return await qwen_llm(prompt);
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message) {
    return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
  }
  const reply = await agent(message);
  return NextResponse.json({ reply });
} 