/*************************************************************************
文件: XBanner.ts
创建: 2020年03月24日
作者: 老张(zwx@xfire.mobi)
描述:
    可视化banner组件，与平台banner进行绑定，方便排版
    当前同时仅允许一个XBanner显示

已解决的案例：
    1.页面A使用XBanner，A弹出B窗口中使用了XBanner，此时A中XBanner会隐藏，而B中XBanner会显示
        随后如果B关闭，那么A中XBanner会重新显示
*************************************************************************/

import xfire from '../XFire/xfire';
import XAd from './XAd';
import XRectangle from './XRectangle';

const { ccclass, property, executeInEditMode, menu } = cc._decorator;

@ccclass
@executeInEditMode
@menu('XFire/XAdBanner')
export default class XAdBanner extends XAd {
    // 绑定的banner广告
    @property({
        displayName: CC_DEV && '绑定banner'
    })
    public bindBanner = '通用banner';

    // 强制banner位于底部
    @property({
        displayName: CC_DEV && '强制位于底部'
    })
    public forceToBottom = true;

    // 强制banner位于底部
    @property({
        displayName: CC_DEV && '不支持移动时隐藏',
        tooltip: CC_DEV && '有些平台不支持banner的移动\n勾选在不支持移动平台上隐藏\n不勾在不支持移动平台上将显示在底部',
        visible: CC_DEV && function () {
            return !this.forceToBottom;
        }
    })
    public hideWhileUnmovable = false;

    public onLoad() {
        if (CC_EDITOR) {
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
        return 'banner';
    }

    public show(): void {
        if (!this.adActive) {
            return;
        }
        if (!this.forceToBottom && this.hideWhileUnmovable && !xfire.supportBannerAdMove()) {
            return;
        }
        // 延后到下一帧执行是为确保排版就绪
        this.scheduleOnce(() => {
            this.scheduleOnce(() => {
                if (this.enabled && this.adActive) {
                    let box = this.node.getBoundingBoxToWorld();
                    xfire.showBanner(this.bindBanner);
                    {
                        xfire.moveBannerToEx(this.bindBanner,
                            box.x,
                            cc.view.getVisibleSize().height - (box.y + box.height),
                            box.width,
                            box.height);
                    }
                    if (this.forceToBottom) {
                        xfire.moveBannerTo(this.bindBanner, 0);
                    }
                }
            }, 0);
        }, 0);
    }

    public hide(): void {
        xfire.hideBanner(this.bindBanner);
    }
}
