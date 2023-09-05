import App from '../App';

const { ccclass, property } = cc._decorator;

@ccclass
export default class LayerCover extends cc.Component {


    /**  进入经典模式 */
    private onclickEnterGameClassicModel(event: cc.Event, data: string) {
        App.getInstance().enterLayerGame();
    }


    /**  进入无尽模式 */
    private onclickEnterGameEndlessModel(event: cc.Event, data: string) {

    }
}
