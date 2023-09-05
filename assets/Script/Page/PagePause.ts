import App from '../App';
import GameData, { MaticMould } from '../GameData';
import LayerGameRussianCity from '../Layer/LayerGameRussianCity';

const { ccclass, property } = cc._decorator;

@ccclass
export default class PagePause extends cc.Component {
    private static instance: PagePause = null;
    public static getInstance(): PagePause {
        return PagePause.instance;
    }

    public constructor() {
        super();
        PagePause.instance = this;
    }

    public onLoad() {
        cc.find('切换主题/白天', this.node).active = GameData.maticMould === MaticMould.夜间模式;
        cc.find('切换主题/夜间', this.node).active = GameData.maticMould === MaticMould.白天模式;
    }

    public start() {}

    public update(dt) {}

    private onclickContinue(event: cc.Event, data: string) {
        this.node.destroy();
    }
    private onclickChangeAppColor(event: cc.Event, data: string) {
        let node: cc.Node = event.target;
        GameData.maticMould = GameData.maticMould === MaticMould.夜间模式 ? MaticMould.白天模式 : MaticMould.夜间模式;
        cc.find('白天', node).active = GameData.maticMould === MaticMould.夜间模式;
        cc.find('夜间', node).active = GameData.maticMould === MaticMould.白天模式;
        LayerGameRussianCity.getInstance().changeAppColor();
        App.getInstance().ChangeAppColor();
    }

    private onclickReplay(event: cc.Event, data: string) {
        LayerGameRussianCity.getInstance().replay();
        this.node.destroy();
    }

    private onclickReturnCover(event: cc.Event, data: string) {
        LayerGameRussianCity.getInstance().node.destroy();
        App.getInstance().enterLayerCover();
    }
}
