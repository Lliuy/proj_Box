/*******************************************************************************
文件: OppoInGameFeeds.ts
创建: 2022年01月25日
作者: 老张(zwx@xfire.mobi)
描述:
    oppo游戏内渲染原生广告组件
    绑定相应组件，会自动将原生广告的素材呈现在组件上
    注意主图组件的尺寸模式，最好选择Custom
    主图主要位640*320尺寸
    显隐控制结点不可以指定组件自身所在结点，因为如果操作自身结点active会从显隐队列中移除
*******************************************************************************/

import XFireAppOppo from '../XFire/xfire_oppo';
import XAd from '../XFireControl/XAd';

const { ccclass, property } = cc._decorator;


@ccclass
export default class OppoInGameFeeds extends XAd {
    /** 标记同一时间是否展示相同广告 */
    public static displaySameAd = true;
    /** displaySameAd为true时定时刷新广告 */
    public static refreshDuration = 30;
    private static lastRefreshTime = 0;
    private static ads: {
        adId: string;
        clickBtnTxt: string;
        creativeType: number;
        desc: string;
        iconUrlList: string[];
        icon: string;
        interactionType: number;
        logoUrl: string;
        title: string;
        imgUrlList: string[];

        platObj: any;
        shown: boolean;
        clicked: boolean;
    }[] = [];

    private static addAdToPool (ad: any, platObj: any) {
        if (!ad) return;
        let adId = ad.adId;
        for (let ad of this.ads) {
            if (ad.adId === adId) return;
        }
        let toAdd = xfire.copy(ad);
        toAdd.platObj = platObj;
        if (this.displaySameAd) {
            this.ads = [toAdd];
        }
        else {
            this.ads.push(toAdd);
        }
    }

    private static getAd (): typeof this.ads[0] {
        let adShown: typeof this.ads[0];
        let adClicked: typeof this.ads[0];
        for (let ad of this.ads) {
            if (!ad.clicked && !ad.shown) {
                return ad;
            }
            else if (!ad.clicked) {
                adShown = ad;
            }
            else {
                adClicked = ad;
            }
        }
        return adShown || adClicked;
    }

    @property({
        displayName: CC_DEV && '绑定原生广告'
    })
    public bindFeeds = '通用feeds';

    @property({
        type: cc.Label,
        displayName: CC_DEV && '广告标题'
    })
    public labelTitle: cc.Label = null;

    @property({
        type: cc.Sprite,
        displayName: CC_DEV && '广告标记'
    })
    public spriteAdMark: cc.Sprite = null;

    @property({
        type: cc.Sprite,
        displayName: CC_DEV && '广告主图'
    })
    public spriteAdImage = null;

    @property({
        type: cc.Label,
        displayName: CC_DEV && '广告按钮文本'
    })
    public labelBtnTxt: cc.Label = null;

    @property({
        type: cc.Button,
        displayName: CC_DEV && '广告按钮'
    })
    public button: cc.Button = null;

    @property({
        type: cc.Button,
        displayName: CC_DEV && '广告按钮2'
    })
    public button2: cc.Button = null;

    @property({
        type: [cc.Node],
        displayName: CC_DEV && '显隐控制结点'
    })
    public controlNodes: cc.Node[] = [];

    private displayingAd: typeof OppoInGameFeeds.ads[0];
    /** 标记素材是否已渲染到控件上 */
    private adRendered = false;

    public onLoad () {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        if (this.button) {
            XFireAppOppo.bindButtonClickListener(this.button, (event) => {
                if (this.displayingAd) {
                    this.displayingAd.platObj.reportAdClick({ adId: this.displayingAd.adId });
                    this.displayingAd.clicked = true;
                }
            });
        }
        if (this.button2) {
            XFireAppOppo.bindButtonClickListener(this.button2, (event) => {
                if (this.displayingAd) {
                    this.displayingAd.platObj.reportAdClick({ adId: this.displayingAd.adId });
                    this.displayingAd.clicked = true;
                }
            });
        }
    }

    public getType (): string {
        return 'feeds';
    }

    public show (): void {
        for (let node of this.controlNodes) {
            if (node === this.node) {
                console.error('OppoInGameFeeds 显隐控制结点不应指定自身组件结点');
                continue;
            }
            node.active = this.adRendered;
        }
    }

    public hide (): void {
        for (let node of this.controlNodes) {
            if (node === this.node) {
                console.error('OppoInGameFeeds 显隐控制结点不应指定自身组件结点');
                continue;
            }
            node.active = false;
        }
    }

    public update (dt: number) {
        if (xfire.plat !== xfire.PLAT_OPPO) return;

        if (!this.adRendered) {
            let ad = (xfire as any).getAd(this.bindFeeds);
            if (!ad) return;
            this.tryToDisplay();
        }
        if (OppoInGameFeeds.displaySameAd && (OppoInGameFeeds.lastRefreshTime + OppoInGameFeeds.refreshDuration) < xfire.gameTime) {
            OppoInGameFeeds.lastRefreshTime = xfire.gameTime;
            this.reload();
        }
        // 统一显示+定时刷新时，如果id不匹配则更新自身
        if (OppoInGameFeeds.displaySameAd && this.displayingAd) {
            let ad = (xfire as any).getAd(this.bindFeeds);
            if (ad && ad.ad && ad.ad.adId !== this.displayingAd.adId) {
                OppoInGameFeeds.addAdToPool(ad.ad, ad.platObj);
            }
            let newAd = OppoInGameFeeds.getAd();
            if (newAd !== this.displayingAd) {
                this.tryToDisplay();
            }
        }
    }

    public reload () {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        let ad = (xfire as any).getAd(this.bindFeeds);
        if (ad) {
            ad.load();
        }
        this.adRendered = false;
    }

    public onEnable (): void {
        super.onEnable();
        this.tryToDisplay();
    }

    public onDisable (): void {
        super.onDisable();
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        let ad = (xfire as any).getAd(this.bindFeeds);
        if (ad) {
            if (!OppoInGameFeeds.displaySameAd) {
                ad.load();
            }
        }
    }

    /** 从池中取出广告进行渲染展示 */
    private tryToDisplay () {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        let validAd = OppoInGameFeeds.getAd();
        if (!validAd) {
            let ad = (xfire as any).getAd(this.bindFeeds);
            if (!ad) return;
            OppoInGameFeeds.addAdToPool(ad.ad, ad.platObj);
            validAd = OppoInGameFeeds.getAd();
        }
        if (!validAd) {
            this.reload();
            return;
        }

        xfire.loadRemoteImage(validAd.imgUrlList[0], false, (frame) => {
            this.displayingAd = validAd;
            if (this.labelTitle) this.labelTitle.string = validAd.title;
            if (this.labelBtnTxt) this.labelBtnTxt.string = validAd.clickBtnTxt;
            if (this.spriteAdImage) this.spriteAdImage.spriteFrame = frame;
            if (this.spriteAdMark) {
                xfire.loadRemoteImage(validAd.logoUrl, true, (frame) => {
                    this.spriteAdMark.spriteFrame = frame;
                });
            }
            this.adRendered = true;
            validAd.shown = true;
            validAd.platObj.reportAdShow({ adId: validAd.adId });
            if (this.node.active && this.adActive) {
                this.show();
            }
        });
    }
}
