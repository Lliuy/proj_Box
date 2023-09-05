/*******************************************************************************
文件: XBannerCleaner.ts
创建: 2020年09月07日
作者: 老张(zwx@xfire.mobi)
描述:
    用于屏蔽广告
*******************************************************************************/

import XAd from './XAd';

const { ccclass, property, executeInEditMode, menu } = cc._decorator;

/** 广告的设置器和屏蔽器 */
@ccclass
@menu('XFire/XAdCleaner')
export default class XAdCleaner extends XAd {
    /** 添加组件时传递给组件的参数 */
    private static constructAdType = '';
    // 清banner
    @property({
        displayName: CC_DEV && '屏蔽banner'
    })
    private cleanBanner = true;
    // 清feeds
    @property({
        displayName: CC_DEV && '屏蔽信息流'
    })
    private cleanFeeds = true;
    // 清block
    @property({
        displayName: CC_DEV && '屏蔽积木广告'
    })
    private cleanBlock = true;
    // 清意见反馈按钮
    @property({
        displayName: CC_DEV && '屏蔽反馈按钮'
    })
    private cleanFeedbackButton = false;

    // 要屏蔽的广告类型，为空表当前为设置器
    private cleanAdType = '';

    public onLoad() {
        if (this.cleanAdType === '' && this.node.getComponents(XAdCleaner).length <= 1) {
            if (this.cleanBanner) {
                XAdCleaner.constructAdType = 'banner';
                this.node.addComponent(XAdCleaner);
            }
            if (this.cleanFeeds) {
                XAdCleaner.constructAdType = 'feeds';
                this.node.addComponent(XAdCleaner);
            }
            if (this.cleanBlock) {
                XAdCleaner.constructAdType = 'block';
                this.node.addComponent(XAdCleaner);
            }
            if (this.cleanFeedbackButton) {
                XAdCleaner.constructAdType = 'feedback';
                this.node.addComponent(XAdCleaner);
            }
            XAdCleaner.constructAdType = '';
        }
        else {
            this.cleanAdType = XAdCleaner.constructAdType;
        }
    }

    public getType(): string {
        return this.cleanAdType;
    }

    public show(): void {
    }

    public hide(): void {
    }

    public onEnable() {
        if (this.cleanAdType !== '') {
            super.onEnable();
        }
    }

    public onDisable() {
        if (this.cleanAdType !== '') {
            super.onDisable();
        }
    }
}
