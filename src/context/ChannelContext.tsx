import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/components/FirebaseProvider';
import { subscribeToChannels, Channel } from '@/services/firestoreService';

const ACTIVE_CHANNEL_KEY = 'neuraltube_active_channel_id';

interface ChannelContextType {
  channels: Channel[];
  activeChannel: Channel | null;
  setActiveChannelById: (channelId: string) => void;
  loading: boolean;
}

const ChannelContext = createContext<ChannelContextType>({
  channels: [],
  activeChannel: null,
  setActiveChannelById: () => {},
  loading: true,
});

export const useChannel = () => useContext(ChannelContext);

export const ChannelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_CHANNEL_KEY)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setChannels([]);
      setLoading(false);
      return;
    }
    const unsub = subscribeToChannels(user.uid, (incoming) => {
      setChannels(incoming);
      setLoading(false);
      // Auto-select first channel if saved one no longer exists
      if (incoming.length > 0) {
        const savedStillExists = incoming.some(c => c.channelId === activeChannelId);
        if (!savedStillExists) {
          setActiveChannelId(incoming[0].channelId);
          localStorage.setItem(ACTIVE_CHANNEL_KEY, incoming[0].channelId);
        }
      }
    });
    return () => unsub();
  }, [user]);

  const activeChannel = channels.find(c => c.channelId === activeChannelId) ?? channels[0] ?? null;

  const setActiveChannelById = (channelId: string) => {
    setActiveChannelId(channelId);
    localStorage.setItem(ACTIVE_CHANNEL_KEY, channelId);
  };

  return (
    <ChannelContext.Provider value={{ channels, activeChannel, setActiveChannelById, loading }}>
      {children}
    </ChannelContext.Provider>
  );
};
