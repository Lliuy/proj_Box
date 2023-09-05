/*************************************************************************
文件: XAdFeeds.ts
创建: 2020年10月10日
作者: 老张(zwx@xfire.mobi)
描述:
    可视化信息流广告组件，与平台信息流广告进行绑定，方便排版
    当前同时仅允许一个XAdFeeds显示

*************************************************************************/

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
        if (CC_EDITOR && false) {
            let cb = () => {
                if (this.node.width === 0 || this.node.height === 0) {
                    this.node.width = 720;
                    this.node.height = 210;
                }
                // 结点创建
                let nodePreview = this.node.getChildByName('预览用 不保存 勿修改');
                if (nodePreview == null) {
                    nodePreview = new cc.Node('预览用 不保存 勿修改');
                    nodePreview.parent = this.node;
                    nodePreview.zIndex = cc.macro.MAX_ZINDEX;
                    (nodePreview as any)._objFlags |= (cc as any).Object.Flags.DontSave;
                    (nodePreview as any)._objFlags |= (cc as any).Object.Flags.HideInHierarchy;
                    (nodePreview as any)._objFlags |= (cc as any).Object.Flags.LockedInEditor;

                    let nodeBG = new cc.Node('bg');
                    nodeBG.parent = nodePreview;
                    nodeBG.addComponent(XRectangle);
                    nodeBG.opacity = 64;

                    let nodeBanner = new cc.Node('banner');
                    nodeBanner.parent = nodePreview;
                    let bannerSprite = nodeBanner.addComponent(cc.Sprite);
                    bannerSprite.sizeMode = cc.Sprite.SizeMode.RAW;
                }
                // 构建预览画面
                let nodeBG = nodePreview.getChildByName('bg');
                let nodeBanner = nodePreview.getChildByName('banner');
                let bannerSprite = nodeBanner.getComponent(cc.Sprite);
                bannerSprite.spriteFrame = xfire.loadRemoteImage('http://imgcdn.orbn.top/g/common/img/SampleBanner01.png');

                nodePreview.width = this.node.width;
                nodePreview.height = this.node.height;
                nodeBG.width = this.node.width;
                nodeBG.height = this.node.height;

                // 2.863为示例图的宽高比例
                if (nodePreview.width / nodePreview.height >= 2.863) {
                    nodeBanner.height = this.node.height;
                    nodeBanner.width = 2.863 * this.node.height;
                    nodeBanner.y = 0;
                }
                else {
                    nodeBanner.width = this.node.width;
                    nodeBanner.height = this.node.width / 2.863;
                    nodeBanner.y = -(this.node.height - nodeBanner.height) / 2;
                }
            };

            this.node.on('refreshPreview', cb, this);
            this.node.on(cc.Node.EventType.SIZE_CHANGED, cb, this);
            cb();
        }
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
