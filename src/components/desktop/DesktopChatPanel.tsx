import React, { useRef } from 'react';
import { MessageSquare, Send, ImageIcon, ChevronRight, Video as VideoIcon } from 'lucide-react';

interface Message {
  id?: number;
  user_id: string;
  text: string;
  type: string;
  image_url?: string;
  voice_url?: string;
  translatedText?: string;
}

interface DesktopChatPanelProps {
  messages: Message[];
  newMessage: string;
  userId: string;
  peerId: string;
  remotePeerId: string;
  isRecording: boolean;
  recordingTime: number;
  onSendMessage: (e: React.FormEvent) => void;
  onMessageChange: (value: string) => void;
  onRemotePeerIdChange: (value: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onStartCall: () => void;
  onTranslate: (id: number, text: string) => void;
  translateLabel: string;
}

export function DesktopChatPanel({
  messages,
  newMessage,
  userId,
  peerId,
  remotePeerId,
  isRecording,
  recordingTime,
  onSendMessage,
  onMessageChange,
  onRemotePeerIdChange,
  onFileUpload,
  onStartRecording,
  onStopRecording,
  onStartCall,
  onTranslate,
  translateLabel
}: DesktopChatPanelProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  return (
    <aside className="w-80 bg-[#0F1935]/60 backdrop-blur-xl border-l border-blue-500/20 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-blue-500/30 bg-gradient-to-r from-[#1428A0] to-[#2563EB] text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <MessageSquare size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm">Team Chat</h3>
            <p className="text-[10px] opacity-80">ID: {peerId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            placeholder="Remote Peer ID"
            value={remotePeerId}
            onChange={(e) => onRemotePeerIdChange(e.target.value)}
            className="flex-1 px-2 py-1 text-xs rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-1 focus:ring-white/50"
          />
          <button onClick={onStartCall} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <VideoIcon size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A1628]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.user_id === userId ? 'items-end' : 'items-start'}`}>
            <div className={`group relative max-w-[85%] p-3 rounded-2xl text-sm shadow-lg ${
              msg.user_id === userId
                ? 'bg-gradient-to-br from-[#1428A0] to-[#2563EB] text-white rounded-tr-none'
                : 'bg-[#1A2942]/80 backdrop-blur-sm text-white rounded-tl-none border border-blue-500/20'
            }`}>
              {msg.type === 'image' ? (
                <img src={msg.image_url} className="rounded-lg max-w-full" referrerPolicy="no-referrer" alt="" />
              ) : msg.type === 'voice' ? (
                <audio controls src={msg.voice_url} className="h-8 max-w-[200px]" />
              ) : (
                <>
                  <p>{msg.text}</p>
                  {msg.translatedText && (
                    <p className="mt-2 pt-2 border-t border-white/20 text-xs text-[#60A5FA] italic">
                      {msg.translatedText}
                    </p>
                  )}
                </>
              )}
              {msg.id && (
                <button
                  onClick={() => onTranslate(msg.id!, msg.text)}
                  className="absolute top-0 right-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#60A5FA] font-bold bg-[#1A2942] px-1.5 py-0.5 rounded border border-blue-500/30"
                >
                  {translateLabel}
                </button>
              )}
            </div>
            <span className="text-[9px] text-gray-500 mt-1 px-1">
              {msg.user_id === userId ? 'You' : msg.user_id}
            </span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-blue-500/30 bg-[#0F1935]/60 backdrop-blur-xl space-y-3">
        <form onSubmit={onSendMessage} className="flex items-center gap-2">
          <label className="p-2 hover:bg-white/10 rounded-full cursor-pointer transition-colors text-gray-400 hover:text-white">
            <ImageIcon size={20} />
            <input type="file" className="hidden" accept="image/*" onChange={onFileUpload} />
          </label>
          <button
            type="button"
            onMouseDown={onStartRecording}
            onMouseUp={onStopRecording}
            className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
          >
            <MessageSquare size={20} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 text-sm rounded-full bg-[#1A2942]/60 border border-blue-500/30 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#60A5FA]/50 transition-all"
          />
          <button type="submit" className="text-[#1428A0] p-2 hover:bg-blue-50 rounded-full transition-colors">
            <Send size={20} />
          </button>
        </form>
        {isRecording && (
          <div className="text-[10px] text-red-500 font-bold text-center">
            Recording: {recordingTime}s / 30s
          </div>
        )}
      </div>
    </aside>
  );
}
