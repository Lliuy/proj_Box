/*******************************************************************************
文件: xfire_kugou.ts
创建: 2021年1月12日
作者: 老张(zwx@xfire.mobi)
描述:
    酷狗 h5 小游戏
    接口文档地址：http://miniapp.kugou.com/doc/mini-game/api/
    支付宝sdk（发红包）：https://b.alipay.com/signing/productSetV2.htm

平台特性：
    1.

发布方法：
    1.安装最新的打包插件1.10.0及以上
    2.打包选择web-mobile平台，成功会生成kugou文件夹，内有 【游戏名】.zip文件

测试方法：
    1.手机安装"Z:\软件\平台接入工具\酷狗androidkugou-debug.apk"
    2.在手机存储目录下新建文件夹kugou
    3.在kugou目录下放置一个game.json文件，内容配置如下：
[{
"url": "http://192.168.1.10/h5/xhsg/index.html",
"icon": "https://superman.cmcm.com/gamemoney/squaticon/huanlenongcun.png",
"name": "游戏名称",
"intro": "游戏介绍",
"gameId": 1831,
"players": 0,
"is_horizontal":0
}]
        其中url为本地测试地址
        gameId由酷狗分配
        players，0表单机
        is_horizontal，0表竖屏，1表横屏
    4.构建出来的kugou目录放到内网服务器下，目录与【3】中的url要匹配
    5.手机打开【1】安装的酷狗音乐，进入【游戏中心】
*******************************************************************************/

import XFireApp, { AdCfg, AppConfig, BannerAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const api: any = (window as any).MiniGame;

export default class XFireAppKuGou extends XFireApp {
    public constructor() {
        super();
        this.plat = this.PLAT_KUGOU;
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUGOU) {
            return;
        }
        this.supportGuestLogin = false;
    }

    public getAdSdkName(): string {
        return '酷狗小程序';
    }

    public supportLogin(): boolean {
        return false;
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

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUGOU) {
            return;
        }
        return new BannerAdKuGou(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUGOU) {
            return;
        }
        return new VideoAdKuGou(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new InterstitialAdKuGou(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUGOU) {
            return;
        }
        return {
            brand: navigator.vendor,
            model: navigator.appVersion,
            pixelRatio: 1,
            screenWidth: cc.view.getVisibleSize().width,
            screenHeight: cc.view.getVisibleSize().height,
            windowWidth: cc.view.getVisibleSize().width,
            windowHeight: cc.view.getVisibleSize().height,
            language: navigator.language
        };
    }

    protected init(config: AppConfig, createAdvertisements = true) {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        super.init(config, false);
        let adsdkcfg = this.getSdkConfig();
        if (adsdkcfg == null) {
            console.error('init失败，尚未配置sdk参数');
            return;
        }
        console.log(`初始化init${this.getSdkConfig().appid}`);
        // 通过登录接口初始化sdk
        api.userLogin({
            appid: this.getSdkConfig().appid,
            loginType: 0,
            success: () => {
                console.log('初始化成功');
            },
            fail: () => {
                console.log('初始化失败');
            }
        });
        setTimeout(() => {
            this.createAdvertisements();
        }, 0);
    }
}

class BannerAdKuGou extends BannerAd{
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
        let banner = api.createBannerAd();
        this.platObj = banner;
        if (banner == null) {
            console.log('创建banner失败：' + this.config.name);
        }
        else {
            console.log('创建banner成功：' + this.config.name);
            // 新接口的onLoad实际为显示成功的回调，还是使用旧的onShow比较符合实际含义 [2020年03月26日 老张]
            // 新的onLoad、旧的onShow 在广告自动刷新时都会再次被调用
            banner.onShow(() => {
                console.log('banner广告展示成功：' + this.config.name);
            });
            banner.onError((err) => {
                console.log('banner广告加载失败：' + this.config.name + ' 错误：' + JSON.stringify(err));
            });
            banner.onLoad((res) => {
                console.log('banner onLoad:' + JSON.stringify(res));
                this.enable = true;
            });
        }
    }

    public destroy(): void {
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.show({x: 50, y: 50});
        }
    }

    protected nativeHide(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.hide();
        }
    }
}

class VideoAdKuGou extends VideoAd {
    // 广告有效性监视
    private monitor = false;

    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUGOU) {
            return;
        }
        let video = api.createRewardVideoAd();
        this.platObj = video;
        if (video == null) {
            console.log('创建video失败');
        }
        else {
            console.log('创建video成功');
            video.onLoad(() => {
                this.enable = true;
                console.log('视频广告加载成功：' + this.config.name);
            });
            video.onError((err: any) => {
                this.enable = false;
                console.error('视频广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
            });
            video.onVideoStart(() => {
                console.log('视频广告展示成功：' + this.config.name);
                cc.game.emit(cc.game.EVENT_HIDE);
            });
        }
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUGOU) {
            return;
        }
        this.playCb = cb;
        if (this.platObj != null) {
            let rcb = (res: any) => {
                console.log(res);
                cc.game.emit(cc.game.EVENT_SHOW);
                this.platObj.offClose(rcb);
                if (cb) {
                    cb(res.isReward);
                }
                this.enable = false;
                this.load();
            };
            this.platObj.onClose(rcb);
            this.platObj.show();
        }
        else {
            if (cb) {
                cb(false);
            }
        }
    }
}

class InterstitialAdKuGou extends InterstitialAd {

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let ad = api.createInsertAd();
        this.platObj = ad;
        if (ad == null) {
            console.log('插屏广告创建失败：' + this.config.name);
        }
        else {
            console.log('插屏广告创建成功：' + this.config.name);
            ad.onError((err: any) => {
                console.log('插屏广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
            });
            this.enable = true;
        }
    }

    public destroy(): void {
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.show();
        }
    }
}
