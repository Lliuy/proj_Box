/*******************************************************************************
文件: xfire_linksure.ts
创建: 2020年08月06日
作者: 老张(zwx@xfire.mobi)
描述:
    连尚小游戏
    接口文档地址：https://www.wjminiapp.com/docs/minigame/guide/debug.html
    后台管理地址：https://developer.wjminiapp.com/pms/#/

平台特性：
    类似jkw、oppo的平台

发布方法：
    1.安装最新的打包插件1.4.0及以上
    2.打包选择即刻玩平台，成功会生成linksure文件夹，内有 【游戏名】.zip文件
    3.zip文件上传后台即可

测试方法：
    1.手机安装"Z:\软件\平台接入工具\连尚小游戏调试器.apk"，打开开启vConsole调试
    2.将打包出来的zip文件上传到后台
    3.上传成功后手机扫码后台的【极速版二维码】

*******************************************************************************/

import XFireApp, { AdCfg, AppConfig, BannerAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const lsapi: any = (window as any).wuji;

export default class XFireAppLinkSure extends XFireApp{
    public constructor() {
        super();
        this.plat = this.PLAT_LINKSURE;
        this.supportGuestLogin = false;
    }

    public getAdSdkName(): string {
        return '连尚小程序';
    }

    public supportVibrate(): boolean {
        return true;
    }

    public vibrateShort() {
        lsapi.vibrateShort();
    }

    public vibrateLong() {
        lsapi.vibrateLong();
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
                result[this.SCOPE_WRITEPHOTOSALBUM] = true;
                result[this.SCOPE_RECORD] = true;
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

    public supportClipboard() {
        return true;
    }

    public setClipboardData(content: string): Promise<boolean> {
        return new Promise<boolean> ((resolve) => {
            lsapi.setClipboardData({
                data: content,
                success: () => {
                    resolve(true);
                },
                fail: () => {
                    resolve(false);
                }
            });
        });
    }

    public getClipboardData(): Promise<string> {
        return new Promise<string> ((resolve) => {
            lsapi.getClipboardData({
                success: (res) => {
                    resolve(res.data);
                },
                fail: () => {
                    resolve('');
                }
            });
        });
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new BannerAdLinkSure(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdLinkSure(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let info = lsapi.getSystemInfoSync();
        if (info == null) {
            console.error('systemInfo尚未准备好');
            return null;
        }
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

class BannerAdLinkSure extends BannerAd{
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
        let { windowWidth, windowHeight } = lsapi.getSystemInfoSync();
        let banner = lsapi.createBannerAd({
            adUnitId: this.config.id,
            adIntervals: 30,
            style: {
                top: windowHeight, // 置于屏幕底部
                left: (windowWidth - 320) / 2, // 居中
                width: 320
                // height: 200, // 宽高比是固定的，height值可不传
            }
        });
        this.platObj = banner;
        if (banner == null) {
            console.log('创建banner失败：' + this.config.name);
        }
        else {
            console.log('创建banner成功：' + this.config.name);
            banner.onLoad(() => {
                this.enable = true;
                if (this.toShow) {
                    this.show();
                }
            });
            banner.onError((err) => {
                console.log('banner广告加载失败：' + this.config.name + ' 错误：' + JSON.stringify(err));
                this.enable = false;
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

class VideoAdLinkSure extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let param = {adUnitId: this.config.id};
        let video = lsapi.createRewardedVideoAd(param);
        this.platObj = video;

        if (video != null) {
            console.log('创建video成功：' + this.config.name);
            video.onError((err: any) => {
                console.log('视频广告展示失败：' + this.config.name + ' 错误:' + JSON.stringify(err));
                this.enable = false;
            });
            video.onLoad(() => {
                console.log('视频广告加载成功：' + this.config.name);
                this.enable = true;
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
            this.platObj.onClose((res) => {
                this.platObj.offClose();
                cb(res && res.isEnded);
                this.enable = false;
                this.platObj.load();
            });
            this.platObj.show();
        }
    }
}
