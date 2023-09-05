import LayerGameRussianCity from '../Layer/LayerGameRussianCity';

const { ccclass, property } = cc._decorator;

@ccclass
export default class PageGameRussianCityEnd extends cc.Component {
    private static instance: PageGameRussianCityEnd = null;
    public static getInstance(): PageGameRussianCityEnd {
        return PageGameRussianCityEnd.instance;
    }

    @property(cc.Label)
    public labelScore: cc.Label = null;

    public constructor() {
        super();
        PageGameRussianCityEnd.instance = this;
    }

    public onLoad() {
        this.labelScore.string = '分数: ' + LayerGameRussianCity.getInstance().game.getScore();
    }

    public start() {}

    public update(dt) {}

    private onclickReturn(event: cc.Event, data: string) {
        this.node.destroy();
        LayerGameRussianCity.getInstance().replay();
        this.node.dispatchEvent(new cc.Event.EventCustom('jumptocover', true));
    }

    private onclickReplay(event: cc.Event, data: string) {
        this.node.destroy();
        LayerGameRussianCity.getInstance().replay();
    }
}
