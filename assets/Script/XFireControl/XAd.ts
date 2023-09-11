/*******************************************************************************
文件: XAd.ts
创建: 2020年09月07日
作者: 老张(zwx@xfire.mobi)
描述:
    广告组件管理
*******************************************************************************/

import xfire from "../XFire/xfire";

const { ccclass, property, executeInEditMode, menu } = cc._decorator;

@ccclass
export default abstract class XAd extends cc.Component {
    protected static adStacks: {[key: string]: XAd[]} = {};
    /** 待刷新广告类型 */
    protected static toRefreshTypes: {[key: string]: boolean} = {};
    /** 给每个XBanner组件分配一个独立id */
    private static uniqueId = 1;

    /** 请求刷新某类型广告 */
    private static requestToRefresh(type: string) {
        let keys = Object.keys(XAd.toRefreshTypes);
        if (keys.length === 0) {
            setTimeout(() => {
                let keys = Object.keys(XAd.toRefreshTypes);
                for (let type of keys) {
                    this.refresh(type);
                }
                this.toRefreshTypes = {};
            }, 0);
        }
        XAd.toRefreshTypes[type] = true;
    }

    private static refresh(type: string) {
        let stack = this.adStacks[type];
        if (stack == null || stack.length === 0) {
            return;
        }
        stack.sort((a, b) => {
            return xfire.compareNodeOrder(a.node, b.node);
        });
        // 先隐藏
        for (let i = stack.length - 2; i >= 0; i--) {
            let ad = stack[i];
            if (ad.adActive) {
                ad.adActive = false;
                ad.hide();
            }
        }
        // 激活最后一个
        let ad = stack[stack.length - 1];
        ad.adActive = true;
        ad.show();
    }

    /** 唯一标记id */
    protected uid = XAd.uniqueId++;
    /** 标记当前广告是否激活 */
    protected adActive = false;

    public abstract getType(): string;
    public abstract show(): void;
    public abstract hide(): void;
    /** 入栈 */
    public push() {
        let stacks = XAd.adStacks[this.getType()];
        if (stacks == null) {
            XAd.adStacks[this.getType()] = stacks = [];
        }
        stacks.push(this);
        XAd.requestToRefresh(this.getType());
    }

    public pop() {
        let stacks = XAd.adStacks[this.getType()];
        if (stacks == null) {
            console.error('栈空');
            return;
        }
        for (let i = 0; i < stacks.length; i++) {
            let ad = stacks[i];
            if (ad.uid === this.uid) {
                ad.hide();
                stacks.splice(i, 1);
                XAd.requestToRefresh(this.getType());
                break;
            }
        }
    }

    /** 请求刷新，例如位置移动了 */
    public refresh() {
        if (this.adActive) {
            XAd.requestToRefresh(this.getType());
        }
    }

    public onEnable() {
        this.push();
    }

    public onDisable() {
        this.pop();
    }
}
