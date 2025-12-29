import { defineComponent,ref} from "vue";

export interface InputTestModalProps {
    prompt: string;
    onSubmit: (value: string) => void;
    onCancel: () => void;
}

const InputTestModal = defineComponent(
    (
        props: {
            prompt: String,
            onSubmit: Function, 
            onCancel: Function,
        }
    ) => {
        const inputValue = ref("");

        const submit = () => props.onSubmit(inputValue.value);
        const cancel = () => props.onCancel();

        const onInput = (e: Event) => {
            const target = e.target as HTMLInputElement | null;
            inputValue.value = target?.value ?? "";
        };

        const onKeyup = (e: KeyboardEvent) => {
            if (e.key === "Enter") submit();
        };

        return ()=>(
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
                <div class="bg-white p-4 space-y-2">
                    <div>玩家输入</div>
                    <div>{props.prompt}</div>
                    <input
                        value={inputValue.value}
                        onInput={onInput}
                        onKeyup={onKeyup}
                        type="text"
                    />
                    <div class="flex gap-2 justify-end">
                        <button onClick={cancel}>取消</button>
                        <button onClick={submit}>确定</button>
                    </div>
                </div>
            </div>
        )
    }
);

export default InputTestModal;
