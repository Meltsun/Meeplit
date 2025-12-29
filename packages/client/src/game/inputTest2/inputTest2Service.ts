import { reactive } from "vue";

type InputTest2State = {
  visible: boolean;
  prompt: string;
  token: number;
};

// 简化版本：service 内部自管状态，Host 用 v-if 直接订阅 state。
class InputTest2Service {
  public readonly state: InputTest2State;

  #pending?: {
    token: number;
    resolve: (value: string | null) => void;
  };

  constructor() {
    this.state = reactive({
      visible: false,
      prompt: "",
      token: 0,
    });
  }

  async askForInput(prompt: string): Promise<string | null> {
    // 如果前一次还没结束，先终止它
    this.#finish(null);

    const token = Date.now();
    this.state.visible = true;
    this.state.prompt = prompt;
    this.state.token = token;

    return new Promise((resolve) => {
      this.#pending = { token, resolve };
    });
  }

  submit(token: number, value: string) {
    this.#finish(value, token);
  }

  cancel(token: number) {
    this.#finish(null, token);
  }

  #finish(value: string | null, token?: number) {
    if (!this.#pending) return;
    if (token !== undefined && token !== this.#pending.token) return;

    this.state.visible = false;
    this.state.prompt = "";
    this.state.token = 0;

    this.#pending.resolve(value);
    this.#pending = undefined;
  }
}

export const inputTest2Service = new InputTest2Service();
