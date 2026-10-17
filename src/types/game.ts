export type GameState = 
  | 'START' 
  | 'PLAYING' 
  | 'LEVELUP' 
  | 'GAMEOVER' 
  | 'VICTORY' 
  | 'PAUSED' 
  | 'PAUSED_LITE';

export type SubMenuType = 
  | 'options' 
  | 'enemies' 
  | 'attacks' 
  | 'help' 
  | 'about' 
  | 'bonus' 
  | null;

export interface Power {
  id: string;
  name: string;
  category: 'Offensif' | 'Défensif' | 'Utilitaire';
  desc: string;
  icon: string;
  cooldown: number;
  timer: number;
  level: number;
  getNextLevelDesc?: (lvl: number) => string;
  onFire?: () => void;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  xp: number;
  maxXp: number;
  level: number;
  pickupRadius: number;
  facingRight: boolean;
  facingFront: boolean;
  dashTimer: number;
  dashCooldown: number;
  dashDir: { x: number; y: number };
  invincible?: boolean;
}

export interface SaveSlotData {
  time: number;
  level: number;
  hp: number;
  maxHp: number;
  xp: number;
  maxXp: number;
  totalConvinced: number;
  activePowers: { id: string; level: number }[];
  date: string;
  saveTime: string;
}

export interface KillFeedEntry {
  id: string;
  text: string;
}

export interface BreakingNewsData {
  text: string;
  type: 'score' | 'ally' | 'custom';
}
