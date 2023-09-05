/**
 * 小米小程序
 * 接口文档地址 https://dev.mi.com/console/doc/detail?pId=1739
 * 当前缺少准确的权限查看接口
 *
 * 平台特性：
 *      1.后台广告条目创建后还需手动开启
 *
 * 打包方法：
 *      1.发布为小米快游戏
 *      2.最小框架版本1062，插屏从1051开始支持
 *
 * 测试方法：
 *      1.从https://dev.mi.com/console/doc/detail?pId=1738 下载快游戏调试器、快游戏运行环境
 *      2.打开调试器，本地安装选择rpk
 */

import XFireApp, { AdCfg, AppConfig, BannerAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

// 这么做是因为模块使用者不一定有微信api的.d.ts文件
const miapi: any = (window as any).qg;
const ccapi: any = cc;

export default class XFireAppXiaomi extends XFireApp{
    private static validateNativeUserInfoResult(res: any): XUserInfoWithSignature {
        if (!res || !res.userInfo) {
            return null;
        }
        let userInfo = res.userInfo;
        let nickname = userInfo.nickName;
        let avatar = userInfo.avatarUrl;
        let gender = '';
        switch (userInfo.geder) {
            case 1: gender = '男'; break;
            case 2: gender = '女'; break;
        }
        let signature: any = {};
        return new XUserInfoWithSignature(nickname, avatar, gender, signature);
    }

    public constructor() {
        super();
        this.plat = this.PLAT_XIAOMI;
        console.log(JSON.stringify(miapi));
        if (cc.sys.platform !== ccapi.sys.XIAOMI_GAME) {
            console.error('XFireAppXiaomi只可在小米环境下使用');
            return;
        }
    }

    public getAdSdkName(): string {
        return '小米小程序';
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

    public supportMiniProgramNavigate(): boolean {
        return typeof miapi.navigateToMiniGame === 'function';
    }

    public navigateToMiniProgram(nameOrParams: string | {
        name: string;
        path?: string;
        extraData?: any;
        success?: () => void;
        fail?: () => void;
        complete?: () => void;
    }) {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let isName = typeof nameOrParams === 'string';
        let params: any = isName ? {} : nameOrParams;
        let name: string = isName ? nameOrParams : params.name;
        let app = this.getNavigateAppConfig(name);
        let err = '';
        if (app == null) {
            err = '未配置跳转app：' + name;
        }
        else if (!app.enable) {
            err = 'app跳转未允许：' + name;
        }
        else if (app.appId.indexOf('.') === -1) {
            err = 'oppo小程序跳转appId需填写为包名';
        }
        if (err !== '') {
            console.error(err);
            if (params.fail) {
                params.fail();
            }
            if (params.complete) {
                params.complete();
            }
            return;
        }
        miapi.navigateToMiniGame({
            pkgName: app.appId,
            success() {
                if (params.success) {
                    params.success();
                }
            },
            fail(err) {
                console.log('小程序跳转错误：', err);
                if (params.fail) {
                    params.fail();
                }
            },
            complete() {
                if (params.complete) {
                    params.complete();
                }
            }
        });
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
            if (cc.sys.platform === cc.sys.WECHAT_GAME) {
                return;
            }
            let lParams = params || {};
            miapi.getUserInfo({
                success: (res) => {
                    let userInfo = XFireAppXiaomi.validateNativeUserInfoResult(res);
                    if (lParams.success) {
                        lParams.success(userInfo);
                    }
                    resolve({userInfo});
                },
                fail: () => {
                    let err = '用户拒绝授权用户信息';
                    if (lParams.fail) {
                        lParams.fail(err);
                    }
                    resolve({error: err});
                },
                complete: () => {
                    if (lParams.complete) {
                        lParams.complete();
                    }
                }
            });
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
        let adsdkcfg = this.getSdkConfig();
        if (adsdkcfg == null) {
            console.error('login失败：尚未配置xiaomi sdk参数');
            return;
        }
        miapi.login({
            success: (res) => {
                this.logined = true;
                cc.sys.localStorage.setItem(XFireConfigs.平台账号登录标记, 'true');
                if (res && res.data) {
                    if (param.success) {
                        param.success({plat: this.plat, account: res.data.appAccountId.toString(), session: res.data.session});
                    }
                }
                else {
                    if (param.fail) {
                        param.fail({msg: '登录失败'});
                    }
                }
            },
            fail: () => {
                if (param.fail) {
                    param.fail({msg: '登录失败'});
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
        return new BannerAdXiaomi(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdXiaomi(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new InterstitialAdXiaomi(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let info = null;
        if (typeof miapi.getSystemInfoSync === 'function') {
            info = miapi.getSystemInfoSync();
        }
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

class BannerAdXiaomi extends BannerAd{
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
        let banner = miapi.createBannerAd({adUnitId: '12345'/*this.config.id*/});
        this.platObj = banner;
        if (banner == null) {
            console.log('创建banner失败');
        }
        else {
            console.log('创建banner成功');
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

class VideoAdXiaomi extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let param = {adUnitId: '12345'/*this.config.id*/};
        let video = miapi.createRewardedVideoAd(param);
        if (video != null) {
            this.platObj = video;
            video.onError((err: any) => {console.log(err); this.enable = false; });
            video.onLoad(() => { this.enable = true; });
            video.onClose((data: any) => {
                if (this.playCb) {
                    this.playCb(data.isEnded === true);
                }
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
            this.platObj.show();
        }
    }
}

class InterstitialAdXiaomi extends InterstitialAd {
    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let param = {adUnitId: '12345'/*this.config.id*/};
        let ad = miapi.createInterstitialAd(param);
        if (ad != null) {
            this.platObj = ad;
            ad.onError((err: any) => {console.log(err); this.enable = false; });
            ad.onLoad(() => { this.enable = true; });
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
            let cb = () => {
                this.platObj.offClose(cb);
                setTimeout(() => {
                    this.enable = false;
                    this.load();
                }, 0);
            };
            this.platObj.onClose(cb);
            this.platObj.show();
        }
    }
}
