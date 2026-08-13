export type ViewMode = 'DRIVE' | 'XRAY' | 'AMMO' | 'RADAR';

export type LifecycleState = 'IDLE_SLEEP' | 'ACTIVE_HUD';

export interface NewsCard {
  id: string;
  keyword: string;
  title: string;
  category: 'CHIP AI' | 'CARD ĐỒ HỌA' | 'VI XỬ LÝ' | 'LẬP TRÌNH WEB' | 'HỆ THỐNG';
  vietnameseSummary: string;
  techPunchline: string;
  audioText: string;
  source: string;
  timestamp: string;
  bookmarked: boolean;
  specs: {
    label: string;
    value: string;
  }[];
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'HARDWARE' | 'SOFTWARE';
  shortDesc: string;
  webAnalogy: string;
  fullDetail: string;
  specs: { label: string; value: string }[];
  relatedNodeIds: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  radius?: number;
}

export interface AmmoCard {
  id: string;
  title: string;
  category: string;
  punchline: string;
  webAnalogy: string;
  timestamp: string;
  tags: string[];
  codeSnippet?: string;
}

export interface VoiceState {
  isListening: boolean;
  transcript: string;
  aiResponding: boolean;
  aiResponseText: string;
}
