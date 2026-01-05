import GameService from '@/game/GameController';
import type { Ref, ShallowRef } from 'vue';

export type WithoutRefs<T> = {
	[K in keyof T as T[K] extends Ref<any> | ShallowRef<any> ? never : K]: T[K];
};

type GameServiceWithoutRefs = WithoutRefs<GameService>;
export type { GameServiceWithoutRefs as default }