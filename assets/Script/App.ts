import Configs from "./Configs";
import GameData from "./GameData";

const { ccclass, property } = cc._decorator;

@ccclass
export default class App extends cc.Component {
    private static instance: App = null;
    public static getInstance(): App {
        return App.instance;
    }

    @property(cc.Prefab)
    public prefabLayerGameRussianCity: cc.Prefab = null;
    @property(cc.Prefab)
    public prefabLayerCover: cc.Prefab = null;

    @property(cc.Node)
    public nodeBG: cc.Node = null;

    public layerGameRussianCity: cc.Node = null;
    public layerCover: cc.Node = null;

    public constructor() {
        super();
        App.instance = this;
    }

    public onLoad() {

    }

    public start() {
        this.enterLayerCover();
        this.ChangeAppColor();
    }

    public update() { }

    /**  进入封面 */
    public enterLayerCover() {
        this.disableAllNormalLayer();
        if (!this.layerCover) {
            this.layerCover = cc.instantiate(this.prefabLayerCover);
            this.layerCover.parent = this.node;
            this.layerCover.active = true;
        } else {
            this.layerCover.active = true;
        }
    }

    /**  进入游戏界面 */
    public enterLayerGame() {
        this.disableAllNormalLayer();
        if (!this.layerGameRussianCity || !this.layerGameRussianCity.isValid) {
            this.layerGameRussianCity = cc.instantiate(this.prefabLayerGameRussianCity);
            this.layerGameRussianCity.parent = this.node;
            this.layerGameRussianCity.active = true;
        } else {
            this.layerGameRussianCity.active = true;
        }
    }

    /**  更新游戏主题颜色 */
    public ChangeAppColor() {
        let colorStr = Configs.GameColor.bgColor[Number(GameData.maticMould)];
        console.log(colorStr);

        this.nodeBG.color = cc.Color.BLACK.fromHEX(colorStr);
    }

    private disableAllNormalLayer() {
        if (this.layerCover) this.layerCover.active = false;
        if (this.layerGameRussianCity) this.layerGameRussianCity.active = false;
    }
}
