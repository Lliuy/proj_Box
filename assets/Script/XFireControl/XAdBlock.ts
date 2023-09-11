/*************************************************************************
文件: XAdBlock.ts
创建: 2020年10月10日
作者: 老张(zwx@xfire.mobi)
描述:
    可视化积木广告组件，与平台积木广告进行绑定，方便排版
    当前同时仅允许一个XAdBlock显示

*************************************************************************/

import xfire from '../XFire/xfire';
import XAd from './XAd';
import XRectangle from './XRectangle';

const { ccclass, property, executeInEditMode, menu } = cc._decorator;

@ccclass
@executeInEditMode
@menu('XFire/XAdBlock')
export default class XAdBlock extends XAd {
    // 绑定的banner广告
    @property({
        displayName: CC_DEV && '绑定积木广告'
    })
    public bindBlock = '通用block';

    public onLoad() {
        // 更新广告位置
        this.node.on(cc.Node.EventType.POSITION_CHANGED, () => {
            this.show();
        });
    }

    public start() {

    }

    public getType(): string {
        return 'block';
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
                    xfire.moveBlock(this.bindBlock, box.x, cc.view.getVisibleSize().height - (box.y + box.height));
                    xfire.showBlockAd(this.bindBlock);
                }
            }, 0);
        }, 0);
    }

    public hide(): void {
        xfire.hideBlockAd(this.bindBlock);
    }
}
