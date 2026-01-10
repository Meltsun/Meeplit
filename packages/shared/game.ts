import { Revivable } from "./rpc";


@Revivable
abstract class Card{
    public abstract id: number
    public abstract img: string;
    public abstract name: string;
    public abstract description_url?: string;
    public play(): void {}
}

export {Card}