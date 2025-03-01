export interface Task {
  id: string;
  type: 'primary' | 'secondary';
  description: string;
  tokenReward: number;
  completed: boolean;
}

export const PRIMARY_TASKS: Omit<Task, 'id' | 'completed'>[] = [
  {
    type: 'primary',
    description: 'Join Tezza TG Group',
    tokenReward: 500,
  },
  {
    type: 'primary',
    description: 'Win 1 Heads Up Game',
    tokenReward: 500,
  },
  {
    type: 'primary',
    description: 'Post a pic & tag on X @TezzaPoker',
    tokenReward: 500,
  },
  {
    type: 'primary',
    description: 'Sign up for Pool',
    tokenReward: 500,
  },
  {
    type: 'primary',
    description: 'Refer a friend',
    tokenReward: 500,
  },
  {
    type: 'primary',
    description: 'Post a pic & tag on X @PartywithPool',
    tokenReward: 500,
  },
  {
    type: 'primary',
    description: 'Add to Homescreen',
    tokenReward: 500,
  }
];

export const SECONDARY_TASKS: Omit<Task, 'id' | 'completed'>[] = [
  {
    type: 'secondary',
    description: 'Play in tournament on Tezza Poker game (4pm daily)',
    tokenReward: 300,
  },
  {
    type: 'secondary',
    description: 'Play 20 hands on Tezza Poker game',
    tokenReward: 300,
  },
  {
    type: 'secondary',
    description: 'Follow @TezzaPoker on X',
    tokenReward: 300,
  },
  {
    type: 'secondary',
    description: 'Tip the dealer through Pool',
    tokenReward: 300,
  },
  {
    type: 'secondary',
    description: 'Follow @PartywithPool on X',
    tokenReward: 300,
  }
];

export interface Participant {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
  totalTokens: number;
  checkedIn: boolean;
  seatedAt: Date | null;
  customTokens?: number;
}

export interface WaitlistState {
  participants: Participant[];
} 