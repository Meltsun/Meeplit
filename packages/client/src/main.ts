import { createApp} from 'vue'
import { createPinia } from 'pinia'
import Game from '@/game/Game.vue'
import '@/main.css'

const app = 
    createApp(Game)
    .use(createPinia())
    .mount('#app')

// 动态缩放逻辑：根据窗口宽高比，计算缩放系数
// 基础设计尺寸：1440×810 (16:9 宽高比)
const BASE_WIDTH = 1440;
const BASE_HEIGHT = 810;
const BASE_RATIO = BASE_WIDTH / BASE_HEIGHT;

function updateScale() {
	const appEl = document.querySelector('#app > *') as HTMLElement;
	if (!appEl) return;

	const windowWidth = window.innerWidth;
	const windowHeight = window.innerHeight;
	const windowRatio = windowWidth / windowHeight;

	let scale: number;
	if (windowRatio > BASE_RATIO) {
		// 窗口更宽（宽高比更大），按高度缩放，使高度撑满
		scale = windowHeight / BASE_HEIGHT;
	} else {
		// 窗口更高（宽高比更小），按宽度缩放，使宽度撑满
		scale = windowWidth / BASE_WIDTH;
	}

	appEl.style.transform = `scale(${scale})`;
}

// 节流：使用 requestAnimationFrame 限制调用频率
let rafId: number | null = null;

function throttledUpdateScale() {
	if (rafId !== null) return;
	rafId = requestAnimationFrame(() => {
		updateScale();
		rafId = null;
	});
}

// 初始化缩放
updateScale();

// 监听窗口大小变化
window.addEventListener('resize', throttledUpdateScale);





