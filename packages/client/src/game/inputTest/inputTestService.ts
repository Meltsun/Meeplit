import { createVNode, render } from "vue";
import InputTestModal from "./InputTestModal";

export class InputTestService {
    private pending?: {
        resolve: (value: string | null) => void;
        container: HTMLElement;
    };

    async askForInput(prompt: string): Promise<string | null> {
        const container = document.createElement("div");
        document.body.appendChild(container);

        return new Promise((resolve) => {
            const vnode = createVNode(InputTestModal, {
                prompt,
                onSubmit: (value: string) => this.finish(value),
                onCancel: () => this.finish(null),
            });

            this.pending = { resolve, container };
            render(vnode, container);
        });
    }

    private finish(value: string | null) {
        if (!this.pending) return;
        render(null, this.pending.container);
        this.pending.container.remove();
        this.pending.resolve(value);
        this.pending = undefined;
    }
}

export const inputTestService = new InputTestService();
