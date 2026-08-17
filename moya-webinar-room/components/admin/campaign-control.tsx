'use client';

import { useState, useEffect } from 'react';
import { type Campaign } from '@/types/campaign';
import { Rocket, Play, Pause, Square } from 'lucide-react';

export function CampaignControl({ campaign }: { campaign: Campaign | null }) {
  const [status, setStatus] = useState(campaign?.status || 'STOPPED');
  const [loading, setLoading] = useState(false);

  if (!campaign) {
    return (
      <div className="bg-[#121419] p-5 rounded-2xl border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-zinc-500" />
          </div>
          <div>
            <h3 className="font-bold text-white tracking-wide">CTA CAMPAIGN</h3>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">Automated promotions</p>
          </div>
        </div>
        <p className="text-sm text-zinc-500">No campaign configured.</p>
      </div>
    );
  }

  const handleAction = async (action: 'start' | 'pause' | 'resume' | 'stop') => {
    setLoading(true);
    try {
      await fetch(`/api/campaigns/${campaign.id}/${action}`, { method: 'POST' });
      if (action === 'start' || action === 'resume') setStatus('RUNNING');
      if (action === 'pause') setStatus('PAUSED');
      if (action === 'stop') setStatus('STOPPED');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Local development / fallback scheduler:
  // If the campaign is running, we poll the tick endpoint from the client
  // so that campaigns actually send messages without a real cron job set up.
  useEffect(() => {
    if (status !== 'RUNNING') return;
    
    // Poll every 10 seconds to ensure timely delivery
    const interval = setInterval(() => {
      fetch('/api/cta/tick').catch(console.error);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [status]);

  return (
    <div className="bg-[#121419] p-5 rounded-2xl border border-zinc-800 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${status === 'RUNNING' ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-zinc-800'}`}>
            <Rocket className={`w-5 h-5 ${status === 'RUNNING' ? 'text-white' : 'text-zinc-500'}`} />
          </div>
          <div>
            <h3 className="font-bold text-white tracking-wide">CTA CAMPAIGN</h3>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">Automated promotions</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-black/50 border border-zinc-800 px-3 py-1.5 rounded-full text-xs font-bold">
          <span className={`w-2 h-2 rounded-full ${
            status === 'RUNNING' ? 'bg-indigo-500 animate-pulse' : 
            status === 'PAUSED' ? 'bg-amber-500' : 'bg-zinc-500'
          }`} />
          <span className={
            status === 'RUNNING' ? 'text-indigo-400' : 
            status === 'PAUSED' ? 'text-amber-400' : 'text-zinc-400'
          }>{status}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {status === 'STOPPED' && (
          <button 
            onClick={() => handleAction('start')} 
            disabled={loading}
            className="col-span-2 w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            START CAMPAIGN
          </button>
        )}
        
        {status === 'RUNNING' && (
          <>
            <button 
              onClick={() => handleAction('pause')} 
              disabled={loading}
              className="h-12 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-amber-500/20 disabled:opacity-50"
            >
              <Pause className="w-4 h-4 fill-current" />
              PAUSE
            </button>
            <button 
              onClick={() => handleAction('stop')} 
              disabled={loading}
              className="h-12 bg-red-500/20 hover:bg-red-500/30 text-red-500 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-red-500/20 disabled:opacity-50"
            >
              <Square className="w-4 h-4 fill-current" />
              STOP
            </button>
          </>
        )}
        
        {status === 'PAUSED' && (
          <>
            <button 
              onClick={() => handleAction('resume')} 
              disabled={loading}
              className="h-12 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-indigo-500/20 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              RESUME
            </button>
            <button 
              onClick={() => handleAction('stop')} 
              disabled={loading}
              className="h-12 bg-red-500/20 hover:bg-red-500/30 text-red-500 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-red-500/20 disabled:opacity-50"
            >
              <Square className="w-4 h-4 fill-current" />
              STOP
            </button>
          </>
        )}
      </div>
    </div>
  );
}
