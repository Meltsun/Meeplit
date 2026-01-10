import { Revivable } from "./rpc";


@Revivable
abstract class Card{
    public abstract readonly id: number
    public abstract readonly img: string;
    public abstract readonly name: string;
    public abstract readonly description_url?: string;
    public play(): void {}
}

export {Card}