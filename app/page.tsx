"use client";
import React, { useState, useRef } from 'react';

type ChatRole = 'user' | 'bot';
type ChatMessage = { role: ChatRole; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages((msgs) => [...msgs, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      console.log('前端收到：', data);
      let reply = data.reply;
      if (!reply) {
        if (data.raw) {
          reply = JSON.stringify(data.raw);
        } else if (data.error) {
          reply = data.error;
        } else {
          reply = '机器人未能回复，请稍后再试。';
        }
      }
      const botMessage: ChatMessage = { role: 'bot', content: reply as string };
      setMessages((msgs) => [...msgs, botMessage]);
    } catch {
      setMessages((msgs) => [...msgs, { role: 'bot', content: '网络错误，请重试。' }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', color: '#000' }}>
      <h2 style={{ textAlign: 'center' }}>通义千问对话机器人</h2>
      <div style={{ minHeight: 300, marginBottom: 16, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 10, background: '#fafafa' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', margin: '8px 0' }}>
            <span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 16, background: msg.role === 'user' ? '#d1eaff' : '#f0f0f0' }}>
              {msg.role === 'user' ? '我：' : '机器人：'}{msg.content}
            </span>
          </div>
        ))}
        {loading && <div style={{ color: '#888', textAlign: 'left' }}>机器人正在输入...</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请输入你的问题..."
          style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ padding: '8px 16px', borderRadius: 4, background: '#1677ff', color: '#fff', border: 'none' }}>
          发送
        </button>
      </div>
    </div>
  );
}
