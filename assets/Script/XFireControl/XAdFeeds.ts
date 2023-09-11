/*************************************************************************
文件: XAdFeeds.ts
创建: 2020年10月10日
作者: 老张(zwx@xfire.mobi)
描述:
    可视化信息流广告组件，与平台信息流广告进行绑定，方便排版
    当前同时仅允许一个XAdFeeds显示

*************************************************************************/

import xfire from '../XFire/xfire';
import XAd from './XAd';
import XRectangle from './XRectangle';

const { ccclass, property, executeInEditMode, menu } = cc._decorator;

@ccclass
@executeInEditMode
@menu('XFire/XAdFeeds')
export default class XAdFeeds extends XAd {
    // 绑定的banner广告
    @property({
        displayName: CC_DEV && '绑定信息流广告'
    })
    public bindFeeds = '通用feeds';

    public onLoad() {
        // 更新广告位置
        this.node.on(cc.Node.EventType.POSITION_CHANGED, () => {
            this.refresh();
        });
    }

    public start() {

    }

    public getType(): string {
        return 'feeds';
    }

    public show(): void {
        if (!this.adActive) {
            return;
        }
        // 延后到下一帧执行是为确保排版就绪
        this.scheduleOnce(() => {
            this.scheduleOnce(() => {
                if (this.enabled && this.adActive) {
                    let box = this.node.getBoundingBoxToWorld();
                    xfire.showFeedsAd(this.bindFeeds);
                    xfire.moveFeeds(this.bindFeeds,
                        box.x,
                        cc.view.getVisibleSize().height - (box.y + box.height),
                        box.width,
                        box.height);
                }
            }, 0);
        }, 0);
    }

    public hide(): void {
        xfire.hideFeedsAd(this.bindFeeds);
    }
}
