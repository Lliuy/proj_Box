/**
 * 点秦小游戏
 *
 * 平台特性：
 *
 * 发布方法：
 *      1.xhappcfg中不需要配置信息
 *      2.发布为移动浏览器版本，注意勾选md5
 *      3.web-mobile目录打包发给商务
 *
 * 测试方法：
 *      1.项目部署到内网或外网，确保可以浏览器访问
 *      2.安装公司公共svn：/SDK/点秦/H5HXAD.apk
 *      3.打开填写地址运行即可，【注】无法查看js层信息
 *
 * 回调type值参考（接口封装参考，无关外部调用）
 * AD_LOAD_SUCCESS = 0;   //    广告加载成功
 * AD_LOAD_FAIL = 1;      //    广告加载失败
 * AD_CLICK = 2;          //    广告点击
 * AD_CLOSE = 3;          //    广告关闭
 * AD_REWARD = 4;         //    发放奖励
 * AD_SHOW = 5;           //    广告渲染成功
 */

import XFireApp, { AdCfg, AppConfig, BannerAd, InterstitialAd, SdkCfg, VideoAd } from './xfire_base';
import XFireAppMB from './xfire_mb';

const dqapi: any = (window as any).HXADH5;
const win: any = window;

export default class XFireAppMBDQ extends XFireAppMB{
    public videoPlayCB: (succ: boolean) => void = null;
    public videoSucc = false;

    public constructor() {
        super();
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        //  激励视频cb
        win.rewardADCallback = (type) => {
            if (type === 4) {
                this.videoSucc = true;
            }
            else if (type === 3) {
                if (this.videoPlayCB) {
                    this.videoPlayCB(this.videoSucc);
                }
            }
        };
        //  插屏cb
        win.insertADCallback = (type) => {
        };
         //  bannercb
        win.bannerADCallback = (type) => {
        };

    }

    public getAdSdkName(): string {
        return '点秦小游戏';
    }

    public initWithConfigs(config: AppConfig) {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || cc.sys.platform !== cc.sys.MOBILE_BROWSER) {
            return;
        }
        this.appConfig = config;
        let sdk: SdkCfg = this.getSdkConfig();
        if (sdk == null) {
            sdk = {name: this.getAdSdkName(), appid: ''};
            config.sdks.push(sdk);
        }
        sdk.ads = [
            { name: '通用banner', type: 'banner',        'id': ''},
            { name: '通用video',  type: 'video',         'id': ''},
            { name: '通用插屏',   type: 'interstitial',  'id': ''}
        ];
        super.initWithConfigs(config);
    }

    public supportBannerAd(): boolean {
        return true;
    }

    public supportVideoAd(): boolean {
        return true;
    }

    public supportInterstitialAd(): boolean {
        return true;
    }

    public isAdReady(name: string): boolean {
        return true;
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new BannerAdDQ(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdDQ(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new InterstitialAdDQ(sdkConfig, cfg);
    }

    protected getAd(name: string, autoTransAlias = true, type: string = null) {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || cc.sys.platform !== cc.sys.MOBILE_BROWSER) {
            return;
        }
        switch (type) {
            case 'banner':
                return this.advertisements.通用banner;
            case 'video':
                return this.advertisements.通用video;
            case 'interstitial':
                return this.advertisements.通用插屏;
            default:
                return null;
        }
    }
}

class BannerAdDQ extends BannerAd{
    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
    }

    public supportAutoRefresh() {
        return true;
    }

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.platObj = {};
        setTimeout(() => {
            this.enable = true;
            if (this.toShow) {
                this.show();
            }
        }, 0);
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        dqapi.showBannerAD('bannerADCallback');
    }

    protected nativeHide(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        dqapi.closeBannerAD();
    }
}

class VideoAdDQ extends VideoAd{

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.enable = true;
        this.platObj = {};
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        (xfire as XFireAppMBDQ).videoPlayCB = (succ: boolean) => {
            setTimeout(() => {
                cb(succ);
            }, 0);
        };
        (xfire as XFireAppMBDQ).videoSucc = false;
        dqapi.showRewardVideoAD('rewardADCallback');
    }
}

class InterstitialAdDQ extends InterstitialAd {
    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.enable = true;
        this.platObj = {};
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        dqapi.showInsertAD ('insertADCallback');
    }
}
