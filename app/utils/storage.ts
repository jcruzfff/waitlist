import { type Participant } from '../types/waitlist';

const STORAGE_KEY = 'waitlist_participants';
const BROADCAST_CHANNEL = 'waitlist_updates';

let broadcastChannel: BroadcastChannel | null = null;

// Initialize broadcast channel if browser supports it
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);
}

export const saveParticipants = (participants: Participant[]) => {
  // Save to local storage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
  
  // Broadcast update to other windows
  broadcastChannel?.postMessage({
    type: 'UPDATE_PARTICIPANTS',
    participants
  });
};

export const loadParticipants = (): Participant[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading participants from storage:', error);
    return [];
  }
};

export const subscribeToBroadcastUpdates = (callback: (participants: Participant[]) => void) => {
  if (!broadcastChannel) return () => {};

  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'UPDATE_PARTICIPANTS') {
      callback(event.data.participants);
    }
  };

  broadcastChannel.addEventListener('message', handleMessage);
  return () => {
    broadcastChannel?.removeEventListener('message', handleMessage);
  };
};

// Function to open display in new window
export const openDisplayWindow = () => {
  const width = 1920;
  const height = 1080;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  window.open(
    '/display',
    'WaitlistDisplay',
    `width=${width},height=${height},left=${left},top=${top}`
  );
}; 