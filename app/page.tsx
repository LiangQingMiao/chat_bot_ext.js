"use client";
import React, { useState, useRef, useEffect } from "react";

// 类型定义
const moods = [
  { value: "开心", label: "开心 😊" },
  { value: "平静", label: "平静 😌" },
  { value: "难过", label: "难过 😢" },
  { value: "生气", label: "生气 😠" },
  { value: "兴奋", label: "兴奋 🤩" },
];

type ChatRole = "user" | "bot" | "system";
type ChatMessage = { role: ChatRole; content: string; time?: string };
type Achievement = { text: string; date: string; time: number };
type Moment = { src: string; title: string };

function formatTime(date: Date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  // SSR安全：所有依赖window/localStorage/Date的内容都用useEffect初始化
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  // 聊天相关
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // 主题切换
  const [theme, setTheme] = useState<string>('light');
  useEffect(() => {
    if (!isClient) return;
    const t = localStorage.getItem('theme') || 'light';
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, [isClient]);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (isClient) {
      localStorage.setItem('theme', next);
      document.documentElement.setAttribute("data-theme", next);
    }
  };

  // 心情
  const [mood, setMood] = useState<string>(moods[0].value);
  useEffect(() => {
    if (!isClient) return;
    const m = localStorage.getItem('currentMood') || moods[0].value;
    setMood(m);
  }, [isClient]);
  useEffect(() => {
    if (isClient) localStorage.setItem('currentMood', mood);
  }, [mood, isClient]);

  // 成就
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementInput, setAchievementInput] = useState("");
  useEffect(() => {
    if (!isClient) return;
    const arr = JSON.parse(localStorage.getItem('achievements') || '[]');
    setAchievements(arr);
  }, [isClient]);
  useEffect(() => {
    if (isClient) localStorage.setItem('achievements', JSON.stringify(achievements));
  }, [achievements, isClient]);

  // 开心时刻
  const [moments, setMoments] = useState<Moment[]>([
    { src: "/一起玩耍.jpg", title: "和朋友一起玩耍" },
    { src: "/一起画画.jpg", title: "画画的时光" },
    { src: "/美味午餐.jpg", title: "美味的午餐" },
    { src: "/户外探险.jpg", title: "户外探险" },
  ]);

  // 聊天滚动到底部
  useEffect(() => {
    if (isClient) chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, isClient]);

  // 发送消息（非流式，清理reply内容）
  const sendMessage = async () => {
    if (!input.trim()) return;
    const now = isClient ? new Date() : undefined;
    const userMessage: ChatMessage = { role: "user", content: input, time: now ? formatTime(now) : '' };
    setMessages((msgs) => [...msgs, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      let reply = data.reply || '';
      // 只保留中文、数字和常用中文标点
      reply = reply.replace(/[^\u4e00-\u9fa5\d，。！？、；："''（）【】《》——…\s]/g, '');
      setMessages((msgs) => [...msgs, { role: "bot", content: reply, time: isClient ? formatTime(new Date()) : '' }]);
    } catch {
      setMessages((msgs) => [...msgs, { role: "system", content: "网络错误，请重试。", time: isClient ? formatTime(new Date()) : '' }]);
    }
    setLoading(false);
  };

  // 语音播放
  const playText = (text: string, button: HTMLButtonElement) => {
    if (!isClient || !window.speechSynthesis) return;
    if (button.dataset.playing === "true") {
      window.speechSynthesis.pause();
      button.dataset.playing = "false";
      button.textContent = "▶️";
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = "zh-CN";
    utter.onend = () => {
      button.textContent = "🔊";
      button.dataset.playing = "false";
    };
    utter.onerror = () => {
      button.textContent = "🔊";
      button.dataset.playing = "false";
    };
    button.textContent = "⏸️";
    button.dataset.playing = "true";
    window.speechSynthesis.speak(utter);
  };

  // 成就相关
  const addAchievement = () => {
    if (!achievementInput.trim()) return;
    setAchievements([{ text: achievementInput, date: isClient ? new Date().toLocaleDateString('zh-CN') : '', time: isClient ? Date.now() : 0 }, ...achievements]);
    setAchievementInput("");
  };
  const deleteAchievement = (idx: number) => {
    setAchievements(achievements.filter((_, i) => i !== idx));
  };

  // 照片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const title = window.prompt("请输入这张照片的标题：") || "开心时刻";
      setMoments((ms) => [
        ...ms,
        { src: ev.target?.result as string, title },
      ]);
    };
    reader.readAsDataURL(file);
  };

  // 日期时间
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!isClient) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isClient]);

  // 聊天气泡动画样式
  const bubbleAnim = {
    animation: 'bubbleIn 0.5s cubic-bezier(.68,-0.55,.27,1.55)',
  };

  // SSR安全：未到客户端挂载前不渲染依赖window/localStorage/Date的内容
  if (!isClient) return <div style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)' }} />;

  // 渲染
  return (
    <div style={{ minHeight: "100vh", background: theme === 'dark' ? "linear-gradient(120deg, #2c3e50 0%, #3498db 100%)" : "linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)", fontFamily: 'Microsoft YaHei, sans-serif', padding: 0, margin: 0 }}>
      <style>{`
        @keyframes bubbleIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        .chat-bubble {
          transition: box-shadow 0.2s;
        }
        .chat-bubble:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        }
        @media (max-width: 900px) {
          .main-grid { grid-template-columns: 1fr; }
          .side-hide { display: none !important; }
        }
      `}</style>
      {/* 主题切换按钮 */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={theme === "dark"} onChange={toggleTheme} />
          <span>{theme === "dark" ? "🌙" : "☀️"}</span>
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr 250px", gap: 20, maxWidth: 1400, margin: "0 auto", padding: 20 }}>
        {/* 左侧面板 */}
        <div style={{ background: theme === 'dark' ? "rgba(30,30,30,0.95)" : "rgba(255,255,255,0.9)", borderRadius: 20, padding: 20, boxShadow: "0 4px 15px rgba(0,0,0,0.1)", display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: "center", padding: 15, background: theme === 'dark' ? "linear-gradient(135deg, #2c3e50, #34495e)" : "linear-gradient(135deg, #FFE66D, #FF6B6B)", borderRadius: 15, color: '#fff' }}>
            <img src="/头像.png" alt="头像" style={{ width: 100, height: 100, borderRadius: "50%", margin: "0 auto 10px", border: "3px solid white" }} />
            <h3>小朋友</h3>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span>今天心情：</span>
              <select value={mood} onChange={e => setMood(e.target.value)} style={{ padding: '5px 10px', borderRadius: 8, border: '2px solid #FFE66D', background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)', fontSize: 14, cursor: 'pointer', outline: 'none' }}>
                {moods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ background: theme === 'dark' ? "rgba(40,40,40,0.9)" : "rgba(255,255,255,0.9)", borderRadius: 15, padding: 15, marginTop: 20 }}>
            <h3>开心时刻记录</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 10 }}>
              {/* 上传按钮 */}
              <div style={{ border: '2px dashed #FFB7B7', background: 'rgba(255,255,255,0.5)', borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
                <label htmlFor="imageUpload" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: 24, color: '#FF6B6B', marginBottom: 5 }}>+</div>
                  <p style={{ color: '#666', fontSize: 12, margin: 0 }}>添加照片</p>
                  <input type="file" id="imageUpload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                </label>
              </div>
              {moments.map((m, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: '100%', aspectRatio: '1' }}>
                  <img src={m.src} alt="开心时刻" style={{ width: '100%', height: 'calc(100% - 30px)', objectFit: 'cover', display: 'block' }} />
                  <p contentEditable suppressContentEditableWarning={true} style={{ height: 30, padding: 5, margin: 0, fontSize: 12, textAlign: 'center', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 聊天主区域 */}
        <div className="chat-container" style={{ borderRadius: 15, padding: 20, background: theme === 'dark' ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 600 }}>
          {/* 聊天消息区 */}
          <div ref={chatRef} className="chat-messages" style={{ height: 600, overflowY: 'scroll', position: 'relative', background: theme === 'dark' ? 'rgba(40,40,40,0.9)' : '#fff', borderRadius: 10, marginBottom: 16, padding: 10 }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                margin: '15px 0',
                padding: '15px 20px',
                borderRadius: 20,
                maxWidth: '70%',
                position: 'relative',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #FF6B6B, #FFE66D)'
                  : msg.role === 'bot'
                  ? 'linear-gradient(135deg, #A8E6CF, #DCEDC1)'
                  : 'linear-gradient(135deg, #74B9FF, #0984E3)',
                color: msg.role === 'user' ? '#fff' : msg.role === 'bot' ? '#2d3436' : '#fff',
                marginLeft: msg.role === 'user' ? 'auto' : undefined,
                marginRight: msg.role === 'bot' ? 'auto' : undefined,
                textAlign: msg.role === 'system' ? 'center' : undefined,
                fontStyle: msg.role === 'system' ? 'italic' : undefined,
                boxShadow: msg.role === 'user'
                  ? '0 4px 15px rgba(255,107,107,0.2)'
                  : msg.role === 'bot'
                  ? '0 4px 15px rgba(168,230,207,0.2)'
                  : '0 4px 15px rgba(116,185,255,0.2)',
                zIndex: 1,
                animation: 'bounceIn 0.5s ease-in-out',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 'bold' }}>{msg.role === 'user' ? '我' : msg.role === 'bot' ? '小光' : '系统'}：</span>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                  </div>
                  {msg.role === 'bot' && (
                    <button
                      className="voice-button"
                      style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #4CAF50, #8BC34A)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, marginLeft: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      title="点击播放/暂停"
                      onClick={e => playText(msg.content, e.currentTarget)}
                    >🔊</button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ color: '#888', textAlign: 'left', margin: 12 }}>
                <span>小光正在输入</span>
                <span className="dotting">...</span>
              </div>
            )}
          </div>
          {/* 输入区 */}
          <div className="input-area" style={{ display: 'flex', gap: 15, padding: 15, background: 'rgba(255,255,255,0.95)', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', position: 'relative' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="和我说说话吧..."
              style={{ flex: 1, padding: '15px 20px', border: '3px solid #FFE66D', borderRadius: 18, fontSize: 16, background: 'rgba(255,255,255,0.9)', outline: 'none', boxShadow: '0 2px 8px rgba(255,107,107,0.08)', color: '#8B5C2A' }}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{ padding: '15px 30px', background: 'linear-gradient(135deg, #FF6B6B, #FFE66D)', color: '#fff', border: 'none', borderRadius: 15, cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, boxShadow: '0 4px 15px rgba(255,107,107,0.2)' }}
            >发送</button>
          </div>
        </div>
        {/* 右侧面板 */}
        <div style={{ background: theme === 'dark' ? "rgba(40,40,40,0.9)" : "rgba(255,255,255,0.9)", borderRadius: 20, padding: 20, boxShadow: "0 4px 15px rgba(0,0,0,0.1)", display: 'flex', flexDirection: 'column', gap: 20, width: 250, boxSizing: 'border-box' }}>
          <div style={{ background: theme === 'dark' ? "linear-gradient(135deg, #2c3e50, #34495e)" : "linear-gradient(135deg, #A8E6CF, #DCEDC1)", padding: 15, borderRadius: 15, marginBottom: 15, color: theme === 'dark' ? '#fff' : '#2d3436' }}>
            <div style={{ textAlign: 'center' }}>
              {now && (
                <>
                  <div style={{ fontSize: 32, fontWeight: 'bold', color: '#FF6B6B', marginBottom: 5 }}>{now.toLocaleTimeString('zh-CN')}</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 5 }}>{now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  <div style={{ color: '#666' }}>{now.toLocaleDateString('zh-CN', { weekday: 'long' })}</div>
                </>
              )}
            </div>
          </div>
          <div style={{ background: theme === 'dark' ? "linear-gradient(135deg, #2980b9, #3498db)" : "linear-gradient(135deg, #A8E6CF, #DCEDC1)", padding: 15, borderRadius: 15, marginBottom: 15, color: theme === 'dark' ? '#fff' : '#2d3436' }}>
            <h3>今日小贴士</h3>
            <p>记得多喝水哦！</p>
            <p>和小伙伴一起玩耍很开心呢！</p>
          </div>
          <div style={{ background: theme === 'dark' ? "linear-gradient(135deg, #2c3e50, #34495e)" : "linear-gradient(135deg, #FFB7B7, #727272)", padding: 15, borderRadius: 15, color: '#fff', width: '100%', boxSizing: 'border-box' }}>
            <h3>成就墙</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 15, width: '80%' }}>
              <input
                type="text"
                value={achievementInput}
                onChange={e => setAchievementInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addAchievement(); }}
                placeholder="记录一个新的成就..."
                style={{ flex: 1, padding: 8, border: '2px solid #FFE66D', borderRadius: 10, fontSize: 14, width: 128, maxWidth: 128, height: 35, boxSizing: 'border-box' }}
              />
              <button onClick={addAchievement} style={{ padding: '8px 16px', fontSize: '1em', minWidth: 0, maxWidth: 'none', height: 35, borderRadius: 10, background: 'linear-gradient(135deg, #FF6B6B, #FFE66D)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>添加</button>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {achievements.map((a, i) => (
                <div key={a.time} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0', padding: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 10 }}>
                  <img src="/star.png" alt="成就" style={{ width: 30, height: 30 }} />
                  <div>
                    <div>{a.text}</div>
                    <div style={{ fontSize: '0.8em', color: 'rgba(255,255,255,0.7)' }}>{a.date}</div>
                  </div>
                  <button onClick={() => deleteAchievement(i)} style={{ marginLeft: 'auto', padding: '4px 8px', background: 'rgba(255,107,107,0.3)', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', fontSize: 12 }}>删除</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
