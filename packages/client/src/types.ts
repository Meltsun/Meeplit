export type Message = {
  type: 'hello' | 'data' | 'ping';
  payload?: any;
};
