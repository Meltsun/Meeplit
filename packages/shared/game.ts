import { Revivable } from "packages/shared/rpc";


@Revivable
abstract class Card{
    public abstract id: number
    public abstract img: string;
    public abstract name: string;
    public play(): void {}
}

export {Card}