'use client';

import { useState, useEffect } from 'react';
import { type Participant } from '../types/waitlist';
import Leaderboard from '../components/Leaderboard';
import Image from 'next/image';
import { loadParticipants, subscribeToBroadcastUpdates } from '../utils/storage';

export default function DisplayView() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    // Load initial state from local storage
    const storedParticipants = loadParticipants();
    setParticipants(storedParticipants);

    // Subscribe to updates from other windows
    const unsubscribe = subscribeToBroadcastUpdates((updatedParticipants) => {
      setParticipants(updatedParticipants);
    });

    // Listen for fullscreen changes
    const handleFullScreenChange = () => {
      setIsFullScreen(document.fullscreenElement !== null);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      unsubscribe();
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a1a] relative">
      {!isFullScreen && (
        <button
          onClick={toggleFullScreen}
          className="absolute top-4 right-4 z-50 bg-[#2d2d2d] hover:bg-[#404040] text-white p-2 rounded-lg transition-all duration-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      )}
      
      {/* Left side - Event Image */}
      <div className="w-[33%] relative border-r border-[#2d2d2d]">
        <div className="absolute inset-0 bg-[#2d2d2d]" />
        <Image 
          src="/banner.png" 
          alt="Poker Lounge Event"
          fill
          className="object-cover mix-blend-normal"
          priority
        />
      </div>

      {/* Middle - Waitlist */}
      <div className="w-[33%] border-r border-[#2d2d2d] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-[#2d2d2d] bg-[#1a1a1a]">
          <h2 className="text-2xl font-bold text-white mb-2">Waitlist</h2>
          <div className="flex justify-between items-center">
            <p className="text-gray-400 text-sm">
              {participants.filter(p => !p.seatedAt).length} waiting
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col p-4">
          <div className="bg-[#252525] rounded-xl overflow-hidden flex-1">
            {/* Current participant */}
            {participants
              .filter(p => !p.seatedAt)
              .sort((a, b) => a.position - b.position)[0] && (
              <>
                <div className="px-4 py-3 border-b border-[#363636]">
                  <div className="text-sm text-gray-400">Up Next</div>
                </div>
                <div className="p-6 bg-[#2d2d2d] border-b border-[#404040]">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#363636] text-white w-12 h-12 rounded-xl flex items-center justify-center font-bold text-2xl">
                      1
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xl font-semibold">
                        {participants.filter(p => !p.seatedAt).sort((a, b) => a.position - b.position)[0].name}
                      </span>
                      {participants.filter(p => !p.seatedAt).sort((a, b) => a.position - b.position)[0].checkedIn && (
                        <span className="text-green-500">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Rest of the waitlist */}
            <div className="px-4 py-3 border-b border-[#363636]">
              <div className="text-sm text-gray-400">Waiting</div>
            </div>
            <div className="divide-y divide-[#363636]">
              {participants
                .filter(p => !p.seatedAt)
                .sort((a, b) => a.position - b.position)
                .slice(1)
                .map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center p-4 hover:bg-[#2d2d2d] transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-[#363636] text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">
                        {participant.position}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{participant.name}</span>
                        {participant.checkedIn && (
                          <span className="text-green-500">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Leaderboard */}
      <div className="w-[33%] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-[#2d2d2d] bg-[#1a1a1a]">
          <h2 className="text-2xl font-bold text-white mb-2">Leaderboard</h2>
          <p className="text-gray-400 text-sm">{participants.length} builders playing</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <Leaderboard participants={participants} />
        </div>
      </div>
    </div>
  );
} 