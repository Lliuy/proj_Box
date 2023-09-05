/*******************************************************************************
文件: XWidget.ts
创建: 2020年10月26日
作者: 老张(zwx@xfire.mobi)
描述:
    解决非全面屏、全面屏的非一致对齐需求，如非全面屏顶部距离10像素，全面屏50像素

使用方法：
    ✦结点cc.Widget针对全面屏设计
    ✦开启【修改非全面屏】开关，然后修改对齐数字，屏幕高宽比<2视为非全面屏
*******************************************************************************/

const {ccclass, menu, property, requireComponent} = cc._decorator;

@ccclass
@requireComponent(cc.Widget)
@menu('XFire/XWidgetHelper')
export default class XWidgetHelper extends cc.Component {

    // public onLoad () {}
    @property({
        displayName: CC_DEV && '修改非全面屏',
        visible: CC_DEV && function() {
            return this.node.getComponent(cc.Widget) != null;
        }
    })
    public normalScreen = false;

    @property()
    public _top = NaN;
    @property({
        displayName: CC_DEV && 'Top',
        visible: CC_DEV && function() {
            if (!this.normalScreen) {
                return false;
            }
            let cmp = this.node.getComponent(cc.Widget);
            if (cmp == null) {
                return false;
            }
            return cmp.isAlignTop;
        }
    })
    public get top(): number {
        if (this._top == null) {
            this._top = NaN;
        }
        if (isNaN(this._top)) {
            let cmp = this.node.getComponent(cc.Widget);
            return cmp.top;
        }
        return isNaN(this._top) ? 0 : this._top;
    }
    public set top(value: number) {
        this._top = value;
    }

    private isNormalScreen = false;

    public onLoad() {
        if (cc.winSize.height > cc.winSize.width) {
            this.isNormalScreen = (cc.winSize.height / cc.winSize.width) < 2;
        }
        else {
            this.isNormalScreen = (cc.winSize.width / cc.winSize.height) < 2;
        }
        this.refresh();
    }

    public onEnable() {
        this.refresh();
    }

    private refresh() {
        if (!this.normalScreen || !this.isNormalScreen) {
            return;
        }
        let cmp = this.node.getComponent(cc.Widget);
        if (cmp == null) {
            console.error('widget不存在');
            return;
        }
        if (cmp.isAlignTop && !isNaN(this._top)) {
            cmp.top = this._top;
        }
    }


    // public update (dt: number) {}
}
