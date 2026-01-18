export type ChatPlayerMessage = {
  type: 'player';
  playerId: string;
  playerName: string;
  text: string;
  timeStamp: number; // epoch ms
};

export type ChatSystemMessage = {
  type: 'system';
  text: string;
  timeStamp: number; // epoch ms
};

export type ChatDividerMessage = {
  type: 'divider';
  timeStamp: number; // epoch ms
  text?: string;
};

export type ChatMessage = ChatPlayerMessage | ChatSystemMessage | ChatDividerMessage;
