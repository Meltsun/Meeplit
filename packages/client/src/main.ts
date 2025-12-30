import { createApp} from 'vue'
import { createPinia } from 'pinia'
import Game from '@/game/Game.vue'
export type { GameService } from '@/game/Game.vue'
import '@/main.css'

const app = 
    createApp(Game)
    .use(createPinia())
    .mount('#app')





