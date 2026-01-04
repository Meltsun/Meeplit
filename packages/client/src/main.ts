import { createApp} from 'vue'
import { createPinia } from 'pinia'
import Game from '@/game/Game.vue'
import '@/main.css'

const app = 
    createApp(Game)
    .use(createPinia())
    .mount('#app')





