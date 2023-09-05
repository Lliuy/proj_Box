/*******************************************************************************
文件: XTransButton.ts
创建: 2020年06月10日
作者: 老张(zwx@xfire.mobi)
描述:
    触摸事件透传按钮，响应触摸但不会阶段触摸事件，触摸事件还会继续传递，就像本按
    钮不存在一样
    【注意】要使本组件生效有个前提，所有父结点不得有cc.BlockInputEvents组件
*******************************************************************************/

const {ccclass, menu, property} = cc._decorator;

@ccclass
@menu('XFire/XTransButton')
export default class XTransButton extends cc.Component {

    @property([cc.Component.EventHandler])
    public pressEvents: cc.Component.EventHandler[] = [];

    @property([cc.Component.EventHandler])
    public clickEvents: cc.Component.EventHandler[] = [];

    private touchId = -1;

    public start() {
        if (CC_DEV) {
            let parent = this.node.parent;
            while (parent && !(parent instanceof cc.Scene)) {
                if (parent.getComponent(cc.BlockInputEvents)) {
                    console.error(`父结点[${parent.name}]存在cc.BlockInputEvents，XTransButton将无法正确生效`);
                    break;
                }
                parent = parent.parent;
            }
        }
        this.registerNodeEvent();
    }

    private registerNodeEvent () {
        this.node.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
            this.touchId = event.getID();
            this.triggerPress(event);
        }, this.node, true);
        this.node.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) => {
            if (event.getID() !== this.touchId) {
                return;
            }
            this.touchId = -1;
            this.triggerClick(event);
        }, this.node, true);

        if ((this.node as any)._touchListener) {
            (this.node as any)._touchListener.swallowTouches = false;
            console.log('swallow false');
        }
    }

    private triggerPress(event: cc.Event) {
        this.pressEvents.forEach((cb) => {
            cb.emit([event, cb.customEventData]);
        });
    }

    private triggerClick(event: cc.Event) {
        this.clickEvents.forEach((cb) => {
            cb.emit([event, cb.customEventData]);
        });
    }

}
