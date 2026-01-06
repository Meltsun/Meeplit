import {Card} from "@meeplit/shared/game";


export class TestCard extends Card{
    img= "/assets/test.png"
    name= "测试卡牌"
    constructor(public id: number){
        super();
    }
    override play(): void {
        console.log("使用了", this.name);
    }
};