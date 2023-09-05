/*******************************************************************************
文件: XPlatFeedbackButton.ts
创建: 2021年02月04日
作者: 老张(zwx@xfire.mobi)
描述:
    平台反馈按钮
*******************************************************************************/

import { XFeedbackButton } from '../XFire/xfire_base';
import XAd from './XAd';

const { ccclass, property, executeInEditMode, menu } = cc._decorator;

@ccclass
@menu('XFire/XPlatFeedbackButton')
export default class XPlatFeedbackButton extends XAd {
    // 绑定的banner广告
    @property({
        displayName: CC_DEV && '不支持则隐藏'
    })
    public autoHide = true;

    private platButton: XFeedbackButton = null;

    public onLoad() {
        if (this.autoHide && !xfire.supportFeedbackButton()) {
            this.node.active = false;
        }
        // 更新位置
        this.node.on(cc.Node.EventType.POSITION_CHANGED, () => {
            this.refresh();
        });
    }

    public start() {
        if (this.autoHide && !xfire.supportFeedbackButton()) {
            this.node.active = false;
        }
        if (xfire.supportFeedbackButton()) {
            this.platButton = xfire.createFeedbackButton(
                this.node,
                -this.node.width / 2,
                this.node.height / 2,
                this.node.width,
                this.node.height);
        }
    }

    public getType(): string {
        return 'feedback';
    }

    public show(): void {
        if (!this.adActive) {
            return;
        }
        if (this.platButton != null) {
            this.platButton.show();
        }
    }

    public hide(): void {
        if (this.platButton != null) {
            this.platButton.hide();
        }
    }
}
