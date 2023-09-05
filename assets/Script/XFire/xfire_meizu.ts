/**
 * 接口文档https://shimo.im/docs/enni3mhvNyo5fZOm/read
 *
 * 平台特性：
 *      1.广告需联系魅族开通
 *
 * 打包方法：
 *      1.发布成web mobile版本，不可勾选vConsole，否则无法真机无法打开
 *      2.用魅族工具打成rpk包，打包时最小引擎版本设置为1064
 *      3.分辨率设置为0*0
 *      4.放置rpk到魅族手机rpk目录下
 *
 * 调试、查看真机日志：
 *      1.魅族工具打包为debug模式
 *      2.魅族工具填写手机ip地址，确保是同一网络，手机打开游戏（确保关闭了其他游戏仅留一个）
 *      3.点击调试
 */

import XFireApp, { AdCfg, AppConfig, BannerAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const meizuapi: any = (window as any).mz;
const qgapi: any = (window as any).qg;

if (!cc.sys.platform === cc.sys.WECHAT_GAME && meizuapi != null && qgapi != null && (typeof XH_PLAT === 'undefined' || XH_PLAT === 'meizu')) {
    meizuapi.onShow(() => {
        if (!XFireAppMeiZu.getInstance()) {
            return;
        }
        if (!XFireAppMeiZu.getInstance().isVideoAdPlaying()) {
            cc.game.emit(cc.game.EVENT_SHOW);
        }
    });

    meizuapi.onHide(() => {
        if (!XFireAppMeiZu.getInstance()) {
            return;
        }
        if (!XFireAppMeiZu.getInstance().isVideoAdPlaying()) {
            cc.game.emit(cc.game.EVENT_HIDE);
        }
    });
}

export default class XFireAppMeiZu extends XFireApp{

    public constructor() {
        super();
        this.plat = this.PLAT_MEIZU;
        if (meizuapi == null) {
            console.error('XFireAppMeiZu只可在魅族环境下使用');
            return;
        }
    }

    public getAdSdkName(): string {
        return '魅族小程序';
    }

    public mustArchiveOnline(): boolean {
        return true;
    }

    public supportLogin(): boolean {
        return true;
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

    public getSetting(params: {
        success?: (authSetting: {[key: string]: boolean}) => void;
        fail?: (err) => void;
        complete?: () => void;
    }): Promise<{
        authSetting?: {[key: string]: boolean};
        error?: string;
    }> {
        return new Promise<{
            authSetting?: {[key: string]: boolean};
            error?: string;
        }>((resolve) => {
            let lParams = params || {};
            setTimeout(() => {
                let result: any = {};
                result[this.SCOPE_USERINFO] = true;
                if (lParams.success) {
                    lParams.success(result);
                }
                if (lParams.complete) {
                    lParams.complete();
                }
                resolve({authSetting: result});
            }, 0);
        });
    }

    public login(param: {
            timeout?: number;                       // 超时时间，单位ms
            success?: (res: LoginResult) => void;
            fail?: (err: LoginError) => void;
            complete?: () => void;
        }= {}): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        meizuapi.getToken({
            success: (res: {uid: string; token: string}) => {
                this.logined = true;
                cc.sys.localStorage.setItem(XFireConfigs.平台账号登录标记, 'true');
                if (param.success) {
                    param.success({plat: this.plat, token: res.token});
                }
            },
            fail: (err) => {
                if (param.fail) {
                    param.fail({msg: err.msg});
                }
            },
            complete: () => {
                if (param.complete) {
                    param.complete();
                }
            }
        });
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new BannerAdMeiZu(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdMeiZu(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new InterstitialAdMeiZu(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let info = qgapi.getSystemInfoSync();
        return {
            brand: info.brand,
            model: info.model,
            pixelRatio: info.pixelRatio,
            screenWidth: info.screenWidth,
            screenHeight: info.screenHeight,
            windowWidth: info.windowWidth,
            windowHeight: info.windowHeight,
            language: info.language
        };
    }
}

class BannerAdMeiZu extends BannerAd{
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
        // 目前魅族的banner宽高固定6.4：1
        let info = xfire.getSystemInfoSync();
        let params = {
            adUnitId: this.config.id,
            style: {top: info.screenHeight - ((info.screenHeight / info.screenWidth) > 1.9 ? 250 : (info.screenWidth / 6.4))}
        };
        console.log('create banner params:' + JSON.stringify(params));
        let banner = qgapi.createBannerAd(params);
        this.platObj = banner;
        if (banner == null) {
            console.log('banner广告创建失败：' + this.config.name);
        }
        else {
            banner.onLoad(() => {
                console.log('banner广告加载成功：' + this.config.name);
                this.enable = true;
                if (this.toShow) {
                    this.show();
                }
            });
            banner.onError((err: any) => {
                console.log('banner广告加载失败：' + this.config.name + ' 错误：' + JSON.stringify(err));
                this.enable = false;
            });
            // banner.load();
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

    protected nativeHide(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.hide();
        }
    }
}

class VideoAdMeiZu extends VideoAd{
    private playCb: (end: boolean) => void = null;
    private playEnd = false;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let param = {
            adUnitId: this.config.id
        };
        let video = qgapi.createRewardedVideoAd(param);
        if (video != null) {
            this.platObj = video;
            video.onError((err: any) => {
                console.error('视频广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
                console.log(err); this.enable = false;
            });
            video.onVideoStart(() => {
                console.log('开始播放视频广告：' + this.config.name);
            });
            video.onLoad(() => {
                console.log('视频广告加载成功：' + this.config.name);
                this.enable = true;
            });
            video.onClose(() => {
                console.log('视频广告关闭：' + this.config.name);
                this.enable = false;
                if (this.playCb) {
                    this.playCb(this.playEnd);
                }
                setTimeout(() => {
                    this.load();
                }, 0);
            });
            video.onRewarded(() => {
                console.log('视频播放结束：' + this.config.name);
                this.playEnd = true;
            });
            video.load();
        }
        else {
            this.platObj = null;
            this.enable = false;
        }
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.playCb = cb;
        if (this.platObj != null) {
            this.playEnd = false;
            this.platObj.show();
        }
    }
}


class InterstitialAdMeiZu extends InterstitialAd {
    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let param = {adUnitId: this.config.id};
        let ad = qgapi.createInsertAd(param);
        if (ad != null) {
            this.platObj = ad;
            ad.onError((err: any) => {
                console.error('插屏广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
                console.log(err); this.enable = false;
            });
            ad.onLoad(() => {
                console.log('插屏广告加载成功：' + this.config.name);
                this.enable = true;
            });
            ad.onClose(() => {
                this.enable = false;
                setTimeout(() => {
                    this.load();
                }, 0);
            });
            ad.load();
        }
        else {
            this.platObj = null;
            this.enable = false;
        }
    }

    public destroy(): void {
    }

    public update(dt: number, idleTime: number): void {
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
