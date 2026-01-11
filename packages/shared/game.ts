import { Revivable } from "./rpc";


@Revivable
abstract class Card{
    public readonly id: string
    public abstract readonly img: string;
    public abstract readonly name: string;
    public abstract readonly description_url?: string;
    public play(): void {}
    constructor(){
        this.id=crypto.randomUUID()
    }
}

export {Card}