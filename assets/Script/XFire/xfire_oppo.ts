/**
 * oppo小程序
 * 接口文档地址 https://cdofs.oppomobile.com/cdo-activity/static/201810/26/quickgame/documentation/
 *
 * 平台特性：
 *      1.平台必有账号，虽然登录有游客选项，但登录过账号的手机必然需要登录账号，而新手机会自动创建账号。
 *      2.banner和插屏不能共存，目前处理方式设定插屏优先级高于banner，如果显示插屏时有banner存在则自动隐藏，
 *        如果请求显示banner时有插屏存在则不显示banner。
 *      3.可分包，分包最终打在整包中，单包、主包不超4M，整包不超10M
 *
 *      当前加速计接口实测存在问题，数值错误、熄屏返回不再感应。
 *
 * 发布方法：
 *      1.最小平台版本号设置为1060
 *      2.发布为oppo即可打包出rpk
 *
 * 测试方法：
 *      1.从网站下载调试器，https://cdofs.oppomobile.com/cdo-activity/static/201810/26/quickgame/documentation/games/use.html
 *      2.安装到oppo手机
 *      3.将rpk拷贝到oppo手机的【\Android\data\com.nearme.instant.platform\files\games】目录下
 *        较旧版本的调试器放在【\games】目录下
 *      4.在快应用中打开
 *
 * 2019年10月15日 当前oppo快应用2.9.0的banner广告存在hide bug，hide后不久会重新显示，目前方法为如果检测到非法的重新显示则销毁重建
 *
 */

import XFireApp, { AdCfg, AppConfig, BannerAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const oppoapi: any = (window as any).qg;
const PLAT = 'oppo';
let oppoInterstitialAdShowing = false;
let oppoBannerShowing = false;

interface OppoLoginResult {
    uid: string;
    token: string;
    nickName: string;    // 昵称
    avatar: string;      // 头像
    sex: string;         // 性别，M:男 F:女
    phoneNum: string;    // 手机号（带*号）
    data: {
        uid: string;
        token: string;
        nickName: string;
        avatar: string;
        isTourist: string;
        phoneNum: string;
    };
}
interface OppoSystemInfo {
    COREVersion: string;
    brand: string;
    language: string;
    model: string;
    pixelRatio: number;
    platform: string;
    screenHeight: number;
    screenWidth: number;
    system: string;
    windowHeight: number;
    windowWidth: number;
}

let oppoSystemInfo: OppoSystemInfo;

if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.OPPO_GAME) {
    oppoapi.getSystemInfo({
        success(res: OppoSystemInfo) {
            oppoSystemInfo = res;
        }
    });
}

export default class XFireAppOppo extends XFireApp{
    private static validateNativeUserInfoResult(res: OppoLoginResult): XUserInfoWithSignature {
        if (!res) {
            return null;
        }
        let nickname = res.nickName || res.data.nickName;
        let avatar = res.avatar || res.data.avatar;
        let gender = '';
        if (res.sex === 'M') {
            gender = '男';
        }
        else if (res.sex === 'F') {
            gender = '女';
        }
        let signature: any = {};

        return new XUserInfoWithSignature(nickname, avatar, gender, signature);
    }

    private loginResult: OppoLoginResult = null;
    /** 加速度监听函数 */
    private accCb: (res: {x: number; y: number; z: number}) => void = null;

    public constructor() {
        super();
        this.plat = this.PLAT_OPPO;
        this.supportGuestLogin = false;
        if (cc.sys.platform !== cc.sys.OPPO_GAME) {
            console.error('XFireAppOppo只可在OPPO环境下使用');
            return;
        }
    }

    public getAdSdkName(): string {
        return 'oppo小程序';
    }

    public supportVibrate(): boolean {
        return true;
    }

    public vibrateShort() {
        oppoapi.vibrateShort();
    }

    public vibrateLong() {
        oppoapi.vibrateLong();
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

    public supportShortcut(): boolean {
        return oppoapi && oppoapi.installShortcut != null;
    }

    public installShortcut(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            if (cc.sys.platform === cc.sys.WECHAT_GAME || !oppoapi.installShortcut) {
                resolve(false);
                return;
            }
            oppoapi.installShortcut({
                success: () => {
                    resolve(true);
                },
                fail: (err) => {
                    resolve(false);
                }
            });
        });
    }

    public hasShortcutInstalled(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            if (cc.sys.platform === cc.sys.WECHAT_GAME || !oppoapi.hasShortcutInstalled) {
                resolve(false);
                return;
            }
            oppoapi.hasShortcutInstalled({
                success: (res) => {
                    resolve(res === true);
                },
                fail: (err) => {
                    resolve(false);
                }
            });
        });
    }

    public supportMiniProgramNavigate(): boolean {
        return typeof oppoapi.navigateToMiniGame === 'function';
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
        oppoapi.navigateToMiniGame({
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
            if (this.loginResult != null) {
                let userInfo = XFireAppOppo.validateNativeUserInfoResult(this.loginResult);
                setTimeout(() => {
                    if (lParams.success) {
                        lParams.success(userInfo);
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({userInfo});
                }, 0);
                return;
            }
            this.login({
                success: (res) => {
                    this.logined = true;
                    cc.sys.localStorage.setItem(XFireConfigs.平台账号登录标记, 'true');
                    let userInfo = XFireAppOppo.validateNativeUserInfoResult(this.loginResult);
                    if (lParams.success) {
                        lParams.success(userInfo);
                    }
                    resolve({userInfo});
                },
                fail: (err) => {
                    if (lParams.fail) {
                        lParams.fail(JSON.stringify(err));
                    }
                    resolve({error: JSON.stringify(err)});
                },
                complete: () => {
                    if (lParams.complete) {
                        lParams.complete();
                    }
                }
            });
        });
    }

    public supportClipboard() {
        return true;
    }

    public setClipboardData(content: string): Promise<boolean> {
        return new Promise<boolean> ((resolve) => {
            oppoapi.setClipboardData({
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
            oppoapi.getClipboardData({
                success: (res) => {
                    resolve(res.data);
                },
                fail: () => {
                    resolve('');
                }
            });
        });
    }

    public supportAccelerometer(): boolean {
        return false;
    }

    public startAccelerometer() {
        if (oppoapi.startAccelerometer) {
            // qq此接口不会清理微信内的加速度监听函数
            oppoapi.startAccelerometer({interval: 'game'});
            if (this.accCb == null) {
                this.accCb = (res: {x: number; y: number; z: number}) => {
                    this.dispatchAccelerometerChange(res.x, res.y, res.z, false);
                };
                oppoapi.onAccelerometerChange(this.accCb);
            }
        }
    }

    public stopAccelerometer() {
        if (oppoapi.stopAccelerometer) {
            // qq此接口不会清理微信内的加速度监听函数
            oppoapi.stopAccelerometer({});
        }
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
            console.error('login失败：尚未配置oppo sdk参数');
            return;
        }
        oppoapi.login({
            pkg: adsdkcfg.params.package,
            success: (res: OppoLoginResult) => {
                console.log(JSON.stringify(res));
                this.logined = true;
                cc.sys.localStorage.setItem(XFireConfigs.平台账号登录标记, 'true');
                if (res) {
                    this.loginResult = this.copy(res);
                    if (param.success) {
                        let gender = 0;
                        if (res.sex === 'M') {
                            gender = 1;
                        }
                        else if (res.sex === 'F') {
                            gender = 2;
                        }
                        param.success({plat: PLAT,
                            nickname: res.nickName || res.data.nickName,
                            avatar: res.avatar || res.data.avatar, gender,
                            token: res.token || res.data.token});
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
        return new BannerAdOppo(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdOppo(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new InterstitialAdOppo(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let info = null;
        if (typeof oppoapi.getSystemInfoSync === 'function') {
            info = oppoapi.getSystemInfoSync();
        }
        else if (oppoSystemInfo != null) {
            info = oppoSystemInfo;
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

    protected init(config: AppConfig, createAdvertisements = true) {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        super.init(config, false);

        if (oppoapi.reportMonitor) {
            oppoapi.reportMonitor('game_scene', 0);
        }

        let adsdkcfg = this.getSdkConfig();
        if (adsdkcfg == null) {
            console.error('init失败，尚未配置oppo sdk参数');
            return;
        }
        oppoapi.initAdService({
            appId: adsdkcfg.appid,
            isDebug: false,
            success: (res) => {
                console.log('initAdService success');
                setTimeout(() => {
                    this.createAdvertisements();
                }, 0);
            },
            fail: (res) => {
                console.log('initAdService fail:' + res.code + res.msg);
            },
            complete: (res) => {
                console.log('initAdService complete');
            }
        });
    }
}

class BannerAdOppo extends BannerAd{
    /** 游戏前60秒不许有banner */
    private limit = true;
    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        this.limit = xfire.gameTime < 60;
    }

    public supportAutoRefresh() {
        return true;
    }

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let banner = oppoapi.createBannerAd({
            adUnitId: this.config.id
        });
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
                oppoBannerShowing = true;

                if (this.visible) return;
                setTimeout(() => {
                    if (this.visible) return;
                    this.platObj.destroy();
                    oppoBannerShowing = false;
                    this.load();
                }, 0);
            });
            banner.onError((err) => {
                console.log('banner广告加载失败：' + this.config.name + ' 错误：' + JSON.stringify(err));
                // 不能设置为false，因为自动刷新也可能产生错误 [2020年03月26日 老张]
                // this.enable = false;

                // 5秒后重试
                if (!oppoBannerShowing) {
                    setTimeout(() => {
                        if (this.visible && !oppoBannerShowing) {
                            this.nativeShow();
                        }
                    }, 5000);
                }
            });
            this.enable = true;
        }
    }

    public destroy(): void {
    }

    public update(dtSecond: number, idleTimeSecond: number): void {
        if (this. limit && xfire.gameTime > 60) {
            this.limit = false;
            this.nativeShow();
        }
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || this.limit) {
            return;
        }
        if (this.platObj != null && !oppoBannerShowing) {
            // oppo文档指出返回Promise实际没返回，改用旧接口onShow监听 [2020年03月26日 老张]
            this.platObj.show();
        }
    }

    protected nativeHide(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.hide();
            oppoBannerShowing = false;
        }
    }
}

class VideoAdOppo extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let param = {adUnitId: this.config.id};
        let video = oppoapi.createRewardedVideoAd(param);
        this.platObj = video;

        if (video != null) {
            console.log('创建video成功：' + this.config.name);
            video.onError((err: any) => {
                console.log('视频广告展示失败：' + this.config.name + ' 错误:' + JSON.stringify(err));
                if (!this.enable || err.errCode === 20003) {
                    setTimeout(() => {
                        if (!this.enable) {
                            this.platObj.load();
                        }
                    }, 5000);
                    this.platObj.load();
                }
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
            // 1040开始废弃onRewarded
            if (this.platObj.onClose) {
                this.platObj.onClose((res) => {
                    this.platObj.offClose();
                    cb(res && res.isEnded);
                    this.enable = false;
                    this.platObj.load();
                });
            }
            else {
                this.platObj.onRewarded(() => { this.platObj.offRewarded(); cb(true); });
            }
            this.platObj.show();
        }
    }
}

class InterstitialAdOppo extends InterstitialAd {
    private limitTime = 0;      // 限制时间内不能再弹出插屏

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let param = {adUnitId: this.config.id};
        let ad = oppoapi.createInsertAd(param);
        this.platObj = ad;
        if (ad == null) {
            console.log('插屏广告创建失败：' + this.config.name);
        }
        else {
            console.log('插屏广告创建成功：' + this.config.name);
            ad.onError((err: any) => {
                console.log('插屏广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
                if (!this.enable || err.errCode === 20003) {
                    setTimeout(() => {
                        if (!this.enable) {
                            this.platObj.load();
                        }
                    }, 5000);
                }
            });
            ad.onLoad(() => {
                console.log('插屏广告加载成功：' + this.config.name);
                this.enable = true;
            });
            ad.onShow(() => {
                console.log('插屏广告展示成功：' + this.config.name);
                this.limitTime = XFireConfigs.oppo插屏间隔限制;
                oppoInterstitialAdShowing = true;
                // 隐藏显示中的banner
                try {
                    for (let key in xfire.advertisements) {
                        if (!xfire.advertisements.hasOwnProperty(key)) {
                            continue;
                        }
                        let ad = xfire.advertisements[key];
                        if (ad == null || ad.config.type !== 'banner') {
                            continue;
                        }
                        let banner = ad as BannerAdOppo;
                        if (!banner.visible) {
                            continue;
                        }
                        if (banner.platObj) {
                            banner.platObj.hide();
                        }
                    }
                } catch (error) {
                    console.log(JSON.stringify(error));
                }
            });
            ad.onClose(() => {
                console.log('插屏广告关闭：' + this.config.name);
                oppoInterstitialAdShowing = false;
                // 重新加载插屏
                this.enable = false;
                ad.load();
                // 恢复banner
                try {
                    for (let key in xfire.advertisements) {
                        if (!xfire.advertisements.hasOwnProperty(key)) {
                            continue;
                        }
                        let ad = xfire.advertisements[key];
                        if (ad == null || ad.config.type !== 'banner') {
                            continue;
                        }
                        let banner = ad as BannerAdOppo;
                        if (!banner.visible) {
                            continue;
                        }
                        if (banner.platObj) {
                            banner.platObj.show();
                        }
                    }
                } catch (error) {
                    console.log(JSON.stringify(error));
                }
            });
            ad.load();
        }
    }

    public isReady(): boolean {
        return this.enable && this.limitTime === 0;
    }

    public destroy(): void {
    }

    public update(dt: number, idleTime: number): void {
        this.limitTime -= dt;
        if (this.limitTime < 0) {
            this.limitTime = 0;
        }
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            // oppo文档指出返回Promise实际没返回，改用旧接口onShow监听 [2020年03月26日 老张]
            this.platObj.show();
        }
    }
}
