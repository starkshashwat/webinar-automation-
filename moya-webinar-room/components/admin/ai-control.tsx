'use client';

import { useState } from 'react';
import { Bot, Power, PowerOff } from 'lucide-react';

export function AIControl({ 
  webinarId, 
  initialEnabled 
}: { 
  webinarId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  const toggleAI = async () => {
    setLoading(true);
    const newState = !enabled;
    try {
      await fetch('/api/ai/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webinar_id: webinarId, ai_enabled: newState })
      });
      setEnabled(newState);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#121419] p-5 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden group">
      {/* Background glow effect based on state */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 transition-colors duration-700 ${enabled ? 'bg-blue-500' : 'bg-transparent'}`} />
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${enabled ? 'bg-blue-600 shadow-lg shadow-blue-600/20' : 'bg-zinc-800'}`}>
          <Bot className={`w-5 h-5 ${enabled ? 'text-white' : 'text-zinc-500'}`} />
        </div>
        <div>
          <h3 className="font-bold text-white tracking-wide">MOYA AI AUTOPILOT</h3>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">Automated chat moderation</p>
        </div>
      </div>
      
      <div className="relative z-10">
        <button 
          onClick={toggleAI} 
          disabled={loading}
          className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            enabled 
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {enabled ? (
            <>
              <PowerOff className="w-5 h-5" />
              TURN OFF AUTOPILOT
            </>
          ) : (
            <>
              <Power className="w-5 h-5" />
              ENABLE AI AUTOPILOT
            </>
          )}
        </button>
      </div>
    </div>
  );
}
