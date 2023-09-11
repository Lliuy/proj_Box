/*******************************************************************************
文件: XActivator.ts
创建: 2020年10月27日
作者: 老张(zwx@xfire.mobi)
描述:
    条件激活器，满足所有勾选条件即激活，当前支持激活条件：
    ✦屏幕高宽比>=
        用途距离：足够高的屏幕里激活banner
    ✦屏幕高宽比<
    ✦当前为某个平台或sdk
*******************************************************************************/

import xfire from "../XFire/xfire";

const { ccclass, menu, property } = cc._decorator;

@ccclass
@menu('XFire/XActivator')
export default class XActivator extends cc.Component {

    @property({
        displayName: CC_DEV && '激活(高宽比>=)',
        tooltip: CC_DEV && '高宽比大于等于某个值激活结点',
        visible: CC_DEV && function () {
            return this != null;
        }
    })
    public screenRatioBiggerThan = false;

    @property({
        displayName: CC_DEV && '高宽比>=阈值',
        visible: CC_DEV && function () {
            return this.screenRatioBiggerThan;
        }
    })
    public biggerRatio = 2;

    @property({
        displayName: CC_DEV && '激活(高宽比<)',
        tooltip: CC_DEV && '高宽比小于某个值激活结点',
        visible: CC_DEV && function () {
            return this != null;
        }
    })
    public screenRatioSmallerThan = false;

    @property({
        displayName: CC_DEV && '高宽比<阈值',
        visible: CC_DEV && function () {
            return this.screenRatioSmallerThan;
        }
    })
    public smallerRatio = 2;

    @property({
        displayName: CC_DEV && '激活(平台、sdk)',
        tooltip: CC_DEV && '设置指定平台、sdk才激活',
        visible: CC_DEV && function () {
            return this != null;
        }
    })
    public activeByPlat = false;

    @property({
        displayName: CC_DEV && '平台、sdk',
        tooltip: CC_DEV && '可指定单个或多个平台，用英文逗号隔开，如【qq】、【qq,oppo,baidu,vivo安卓】，如果是取反，在最前面加~，如【~qq,baidu】',
        visible: CC_DEV && function () {
            return this.activeByPlat;
        }
    })
    public plats = '';

    public onLoad() {
        this.refresh();
    }

    public start() {

    }

    public onEnable() {
        this.refresh();
    }

    private refresh() {
        let active = false;
        let ratio = cc.winSize.height / cc.winSize.width;
        do {
            if (this.screenRatioBiggerThan) {
                active = ratio >= this.biggerRatio;
                if (!active) break;
            }
            if (this.screenRatioSmallerThan) {
                active = ratio < this.smallerRatio;
                if (!active) break;
            }
            if (this.activeByPlat) {
                let invert = this.plats.trim().indexOf('~') === 0;
                let plats = this.plats.replace(/~/, '').replace(/[， ]/g, ',').split(',');
                if (plats.length === 1 && plats[0] === '') {
                    active = true;
                }
                else if (!invert) {
                    for (let plat of plats) {
                        if (plat === xfire.plat || plat === xfire.getAdSdkName()) {
                            active = true;
                            break;
                        }
                    }
                }
                else if (invert) {
                    active = true;
                    for (let plat of plats) {
                        if (plat === xfire.plat || plat === xfire.getAdSdkName()) {
                            active = false;
                            break;
                        }
                    }
                }
                if (!active) break;
            }
        } while (false);
        this.node.active = active;
    }

    // public update (dt: number) {}
}
