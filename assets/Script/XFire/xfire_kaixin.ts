/**
 * 开心小游戏
 * 文档：http://open.kaixin001.com/doc/index/
 * 平台特性：
 * 发布方法：
 *      1.发布为webmobile工程
 *      2.修改初始化逻辑，开心网初始化存在特殊情况，需要在平台初始化完成后才能进入游戏
 *      3.打包为zip
 *      4.后台上传
 *      5.设置为测试版
 *      6.打开app
 */

import XFireApp, { AdCfg, AppConfig, BannerAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const kaixinapi: any = (window as any).kaixin;

export default class XFireAppKaiXin extends XFireApp{
    private static validateNativeUserInfoResult(): XUserInfoWithSignature {
        let nickname = kaixinapi.getName();
        let avatar = kaixinapi.getPhoto();
        let gender = '';
        let signature: any = {};
        return new XUserInfoWithSignature(nickname, avatar, gender, signature);
    }

    public constructor() {
        super();
        this.plat = this.PLAT_KAIXIN;
        this.supportGuestLogin = false;
        if (kaixinapi == null) {
            console.error('XFireAppKXW只可在开心玩环境下使用');
            return;
        }
    }

    public getAdSdkName(): string {
        return '开心小程序';
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
        });
    }

    public getUserInfo(params?: {
        success?: (info: XUserInfoWithSignature) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        userInfo?: XUserInfoWithSignature;
        error?: string;
    }> {
        return new Promise<{
            userInfo?: XUserInfoWithSignature;
            error?: string;
        }>((resolve) => {
            if (!cc.sys.platform === cc.sys.WECHAT_GAME) {
                return;
            }
            let lParams = params || {};
            let userInfo = XFireAppKaiXin.validateNativeUserInfoResult();
            if (lParams.success) {
                lParams.success(userInfo);
            }
            if (lParams.complete) {
                lParams.complete();
            }
            resolve({userInfo});
        });
    }

    public login(params: {
            timeout?: number;                       // 超时时间，单位ms
            success?: (res: LoginResult) => void;
            fail?: (err: LoginError) => void;
            complete?: () => void;
        }= {}): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        kaixinapi.player.getSignedPlayerInfoAsync('my_payload')
        .then((result: any) => {
            this.logined = true;
            cc.sys.localStorage.setItem(XFireConfigs.平台账号登录标记, 'true');
            console.log(JSON.stringify(result));
            if (params.success) {
                params.success({plat: this.plat, signature: result.signature});
            }
        }).catch((err) => {
            if (params.fail) {
                params.fail({msg: err});
            }
        }).finally(() => {
            if (params.complete) {
                params.complete();
            }
        });
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new BannerAdKaiXin(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdKaiXin(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new InterstitialAdKaiXin(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let width = kaixinapi.systemInfo.getWidth();
        let height = kaixinapi.systemInfo.getHeight();
        return {
            brand: '',
            model: '',
            pixelRatio: 1,
            screenWidth: width,
            screenHeight: height,
            windowWidth: width,
            windowHeight: height,
            language: ''
        };
    }
}

class BannerAdKaiXin extends BannerAd{
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

        let sysInfo = XFireApp.getInstance().getSystemInfoSync();
        let genBannerAdStyle = (style: {left?: number; bottom?: number; width?: number; height?: number}): any => {
            let ratio = cc.view.getVisibleSize().width / sysInfo.screenWidth;
            let left = style.left;
            let top = cc.view.getVisibleSize().height - style.height - style.bottom;
            return {left: left / ratio, top: top / ratio, width: style.width / ratio, height: style.height / ratio};
        };

        let style = genBannerAdStyle(this.config.style);
        kaixinapi.getBannerAdAsync(this.config.id, style)
            .then((banner) => {
                this.platObj = banner;
                return banner.loadAsync();
            }).then(() => {
                console.log('banner广告加载成功：' + this.config.name);
                this.enable = true;
                if (this.toShow) {
                    this.show();
                }
            }).catch((err) => {
                this.enable = false;
            });
    }

    public destroy(): void {
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.showAsync();
            console.log('展示banner:' + this.config.name);
        }
    }

    protected nativeHide(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.hideBannerAsync();
        }
    }
}

class VideoAdKaiXin extends VideoAd{

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.reload();
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.showAsync()
                .then(() => {
                    cb(true);
                }).catch((e) => {
                    cb(false);
                }).finally(() => {
                    this.reload();
                });
            this.enable = false;
        }
    }

    private reload() {
        kaixinapi.getRewardedVideoAsync(this.config.id)
        .then((video) => {
            this.platObj = video;
            return video.loadAsync();
        }).then(() => {
            console.log('视频广告加载成功：' + this.config.name);
            this.enable = true;
        }).catch((err) => {
            console.error('视频广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
            this.enable = false;
        });
    }
}

class InterstitialAdKaiXin extends InterstitialAd {
    public update(dt: number, idleTime: number): void {
    }

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.preload();
    }

    public destroy(): void {
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.showAsync()
                .then(() => {
                }).catch((err) => {
                    console.log('xfire_kaixin:' + err);
                }).finally(() => {
                    this.preload();
                });
            this.enable = false;
        }
    }

    private preload() {
        kaixinapi.getInterstitialAdAsync(this.config.id)
            .then((interstitial) => {
                this.platObj = interstitial;
                return interstitial.loadAsync();
            }).then(() => {
                console.log('插屏广告加载成功：' + this.config.name);
                this.enable = true;
            }).catch((err) => {
                console.error('插屏广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
                this.enable = false;
            });
    }
}
