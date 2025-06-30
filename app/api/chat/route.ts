import { NextRequest, NextResponse } from 'next/server';

const TONGYI_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const API_KEY = 'sk-06097ab4ae604cda83c36d730d3711ef'; // 请替换为你的通义API Key

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message) {
    return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
  }

  try {
    const response = await fetch(TONGYI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: { prompt: message },
      }),
    });
    const data = await response.json();
    console.log('通义API返回：', JSON.stringify(data, null, 2));
    if (data.output && data.output.text) {
      console.log('返回前端内容：', data.output.text);
      return NextResponse.json({ reply: data.output.text, raw: data });
    } else {
      console.log('返回前端内容：', data);
      return NextResponse.json({ reply: '', raw: data, error: '通义API无回复' }, { status: 200 });
    }
  } catch (error) {
    console.log('服务器错误：', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
} 