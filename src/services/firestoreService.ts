import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase';
import { handleFirestoreError, OperationType } from '@/components/FirebaseProvider';

export interface Trend {
  id?: string;
  topic: string;
  score: number;
  velocity: string;
  niche: string;
  volume?: string;
  competition?: string;
  potential?: string;
  revenue?: string;
  status: 'hot' | 'rising' | 'stable';
  updatedAt?: Timestamp;
}

export interface Video {
  id?: string;
  title: string;
  stage: 'research' | 'ideation' | 'scripting' | 'voiceover' | 'visuals' | 'thumbnail' | 'assembly' | 'seo' | 'review' | 'publish' | 'error';
  progress?: number;
  eta?: string;
  scheduled?: string;
  views?: string;
  revenue?: string;
  time?: string;
  niche?: string;
  authorUid: string;
  createdAt?: Timestamp;
  // AI Generated Content
  script?: {
    hook: string;
    body: string;
    outro: string;
  };
  visuals?: string;
  thumbnailUrl?: string;
  seo?: {
    tags: string[];
    description: string;
  };
  youtubeVideoId?: string;
  videoBase64?: string;
  videoAssembled?: boolean;
  videoAssemblyError?: string;
  videoDurationSec?: number;
  videoFileSizeBytes?: number;
  voiceoverBase64?: string;
  visualKeywords?: string[];
  // A/B Thumbnail Testing
  thumbnailVariantA?: string;  // base64 or URL of variant A
  thumbnailVariantB?: string;  // base64 or URL of variant B
  thumbnailCtrA?: number;      // click-through rate for variant A
  thumbnailCtrB?: number;      // click-through rate for variant B
  thumbnailWinner?: 'A' | 'B' | null;
  thumbnailAbStatus?: 'pending' | 'testing' | 'complete';
}

export interface AILog {
  id?: string;
  event: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Timestamp;
}

export interface Niche {
  id?: string;
  name: string;
  channels: number;
  avgRPM: string;
  saturation: number;
  opportunity: number;
  topGap: string;
  monthlyRev: string;
}

export interface RevenuePoint {
  id?: string;
  day: string;
  revenue: number;
  views: number;
}

// Trends Service
export const subscribeToTrends = (callback: (trends: Trend[]) => void) => {
  const q = query(collection(db, 'trends'), orderBy('score', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const trends = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trend));
    callback(trends);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'trends');
  });
};

// Videos Service
export const subscribeToVideos = (callback: (videos: Video[]) => void) => {
  const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
    callback(videos);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'videos');
  });
};

export const addVideo = async (video: Omit<Video, 'id' | 'createdAt'>) => {
  try {
    const cleanVideo = Object.fromEntries(
      Object.entries({ ...video, createdAt: serverTimestamp() })
        .filter(([_, v]) => v !== undefined)
    );
    await addDoc(collection(db, 'videos'), cleanVideo);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'videos');
  }
};

export const updateVideoStage = async (videoId: string, stage: Video['stage'], progress?: number) => {
  try {
    const videoRef = doc(db, 'videos', videoId);
    await updateDoc(videoRef, { stage, progress });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `videos/${videoId}`);
  }
};

// Logs Service
export const subscribeToLogs = (callback: (logs: AILog[]) => void) => {
  const q = query(collection(db, 'ai_logs'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AILog));
    callback(logs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'ai_logs');
  });
};

// Niches Service
export const subscribeToNiches = (callback: (niches: Niche[]) => void) => {
  const q = query(collection(db, 'niches'), orderBy('opportunity', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const niches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Niche));
    callback(niches);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'niches');
  });
};

// Revenue Service
export const subscribeToRevenue = (callback: (points: RevenuePoint[]) => void) => {
  const q = query(collection(db, 'revenue'), orderBy('day', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const points = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RevenuePoint));
    callback(points);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'revenue');
  });
};
