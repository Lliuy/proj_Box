/**
 * oppo小程序
 * 接口文档地址 https://ie-activity-cn.heytapimage.com/static/minigame/CN/docs/index.html#/develop/
 *
 * 平台特性：
 *      1.平台必有账号，虽然登录有游客选项，但登录过账号的手机必然需要登录账号，而新手机会自动创建账号。
 *      2.banner和插屏不能共存，目前处理方式设定插屏优先级高于banner，如果显示插屏时有banner存在则自动隐藏，
 *        如果请求显示banner时有插屏存在则不显示banner。
 *      3.包总大小不能超过20M，单个分包不能超过4M
 *
 * 发布方法：
 *      1.最小平台版本号设置为1091
 *      2.发布为oppo即可打包出rpk
 *
 * 测试方法：
 *      1.从网站下载调试器，https://cdofs.oppomobile.com/cdo-activity/static/201810/26/quickgame/documentation/games/use.html
 *      2.安装到oppo手机
 *      3.将rpk拷贝到oppo手机的【\Android\data\com.nearme.instant.platform\files\games】目录下
 *        较旧版本的调试器放在【\games】目录下
 *      4.在快应用中打开
 *      5.【附加信息】oppo提供免费云真机https://open.oppomobile.com/cloudmachine/index
 *
 * 调试方法：
 *      android studio可以查看日志输出
 *
 * 2019年10月15日 当前oppo快应用2.9.0的banner广告存在hide bug，hide后不久会重新显示，目前方法为如果检测到非法的重新显示则销毁重建
 *
 */

import SimpleUI from '../XModule/SimpleUI';
import { SNode } from '../XModule/SimpleUI/SUIData';
import SUIResLoader from '../XModule/SimpleUI/SUIResLoader';
import xfire from './xfire';
import XFireApp, { AdCfg, AppConfig, BannerAd, FeedsAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
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

if (!(cc.sys.platform === cc.sys.WECHAT_GAME) && cc.sys.platform === cc.sys.OPPO_GAME) {
    oppoapi.getSystemInfo({
        success(res: OppoSystemInfo) {
            oppoSystemInfo = res;
        }
    });
}

export default class XFireAppOppo extends XFireApp{
    public static resLoader: SUIResLoader = null;

    public static bindButtonClickListener(nodeOrBtn: cc.Node | cc.Button, listener: (event: cc.Event) => void) {
        if (xfire.plat !== xfire.PLAT_OPPO) {
            return;
        }
        if (nodeOrBtn == null) {
            return;
        }
        let btn = nodeOrBtn instanceof cc.Node ? nodeOrBtn.getComponent(cc.Button) : nodeOrBtn as cc.Button;
        if (btn) {
            let eventHandler = new cc.Component.EventHandler();
            eventHandler.target = btn.node;
            eventHandler.component = 'cc.Button';
            let handlerName = 'onclickDynamic_' + xfire.currentTimeMillis;
            while (btn[handlerName] != null) {
                handlerName = 'onclickDynamic_' + xfire.currentTimeMillis + xfire.getRandomInteger(0, 10000);
            }
            eventHandler.handler = handlerName;
            (btn as any)[handlerName] = listener;
            if (btn.clickEvents == null) btn.clickEvents = [];
            btn.clickEvents.push(eventHandler);
        }
    }

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

    /** feeds关闭按钮缩放 */
    public feedsCloseButtonScale = 1;
    private loginResult: OppoLoginResult = null;

    public constructor() {
        super();
        this.plat = this.PLAT_OPPO;
        this.supportGuestLogin = false;
        if (cc.sys.platform !== cc.sys.OPPO_GAME) {
            console.error('XFireAppOppo只可在OPPO环境下使用');
            return;
        }

        class ResLoader extends SUIResLoader {
            public loadImage(name: string, ext?: string): Promise<cc.SpriteFrame> {
                return new Promise<cc.SpriteFrame>((resolve) => {
                    let localBundle = cc.resources || cc.assetManager.getBundle('Resource');
                    let loadRemote = () => {
                        cc.assetManager.loadRemote('https://imgcdn.orbn.top/g/common/nad/' + name + (ext == null ? '.png' : ext), (err, tex) => {
                            let frame = new cc.SpriteFrame();
                            frame.name = name;
                            if (tex instanceof cc.Texture2D && err == null) {
                                frame.setTexture(tex);
                            }
                            resolve(frame);
                        });
                    };
                    if (localBundle) {
                        localBundle.load('Image/nad/' + name, cc.SpriteFrame, (err, spriteFrame: cc.SpriteFrame) => {
                            if (err) {
                                loadRemote();
                            }
                            else {
                                resolve(spriteFrame);
                            }
                        });
                    }
                    else {
                        loadRemote();
                    }
                });
            }
        }
        XFireAppOppo.resLoader = new ResLoader();
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

    public supportFeedsAd(): boolean {
        return true;
    }

    public supportShortcut(): boolean {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        return oppoapi && oppoapi.installShortcut != null;
    }

    public installShortcut(): Promise<boolean> {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
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
        if (xfire.plat !== xfire.PLAT_OPPO) return;
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
        if (xfire.plat !== xfire.PLAT_OPPO) return;
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
        if (xfire.plat !== xfire.PLAT_OPPO) return;

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
        if (xfire.plat !== xfire.PLAT_OPPO) return;
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
        if (xfire.plat !== xfire.PLAT_OPPO) return;
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
        if (xfire.plat !== xfire.PLAT_OPPO) return;
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
        if (xfire.plat !== xfire.PLAT_OPPO) return;
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

    public login(param: {
            timeout?: number;                       // 超时时间，单位ms
            success?: (res: LoginResult) => void;
            fail?: (err: LoginError) => void;
            complete?: () => void;
        }= {}): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;

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
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        return new BannerAdOppo(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        return new VideoAdOppo(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        return new InterstitialAdOppo(sdkConfig, cfg);
    }

    public createFeedsAd(sdkConfig: SdkCfg, cfg: AdCfg): FeedsAd {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        return new FeedsAdOppo(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
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

    public triggerGC() {
        oppoapi.triggerGC();
    }

    protected init(config: AppConfig, createAdvertisements = true) {
        if (xfire.plat !== xfire.PLAT_OPPO) return;

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
    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
    }

    public supportAutoRefresh() {
        return true;
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;

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

    protected nativeShow(): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;

        if (this.platObj != null && !oppoBannerShowing) {
            // oppo文档指出返回Promise实际没返回，改用旧接口onShow监听 [2020年03月26日 老张]
            this.platObj.show();
        }
    }

    protected nativeHide(): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;

        if (this.platObj != null) {
            this.platObj.hide();
            oppoBannerShowing = false;
        }
    }
}

class VideoAdOppo extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;

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
        if (xfire.plat !== xfire.PLAT_OPPO) return;

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
        if (xfire.plat !== xfire.PLAT_OPPO) return;

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
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        return this.enable && this.limitTime === 0;
    }

    public destroy(): void {
    }

    public update(dt: number, idleTime: number): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        this.limitTime -= dt;
        if (this.limitTime < 0) {
            this.limitTime = 0;
        }
    }

    protected nativeShow(): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        if (this.platObj != null) {
            // oppo文档指出返回Promise实际没返回，改用旧接口onShow监听 [2020年03月26日 老张]
            this.platObj.show();
        }
    }
}

class FeedsAdOppo extends FeedsAd {
    private nodeAd: cc.Node = null;
    private loading = false;
    private adId = '';
    /** 准备下载 下载中 准备安装 安装中 已安装 */
    private downloadStatus = '';
    private lblDownload: cc.Label = null;
    /** 标记点击是否已上报，一个onLoad只能一次展示上报 一次点击上报 */
    private clickReported = false;
    /** 标记广告已经点击 */
    private clicked = false;
    /** 关闭回调 */
    private onclose: () => void;
    private lastLoadTime = 0;
    private ad: {
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
    } = null;

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, xfire.copy(config));
        if (xfire.plat !== xfire.PLAT_OPPO) {
            return;
        }
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        this.enable = false;
        if (!this.platObj) {
            let ad = oppoapi.createNativeAd({
                adUnitId: this.config.id
            });
            this.platObj = ad;
            if (ad == null) {
                console.log('原生广告创建失败：' + this.config.name);
            }
            else {
                console.log('原生广告创建成功：' + this.config.name);
                /**
                 * 返回示例
                 * {
                 *     "adList": [{
                 *             "adId": "16625454-28d2-486c-bab2-8d8dc802522c",
                 *             "clickBtnTxt": "了解详情",
                 *             "creativeType": 6,
                 *             "desc": "快手品质年货节，好物0.01抢",
                 *             "iconUrlList": ["https://store.heytapimage.com/img/202201/17/0d3248f10ce031f158a0dba2e544216a.png"],
                 *             "icon": "https://store.heytapimage.com/img/202201/17/0d3248f10ce031f158a0dba2e544216a.png",
                 *             "interactionType": 2,
                 *             "logoUrl": "https://ocs-cn-south1.heytapcs.com/ads-union/union/adlogo/logo_w_b.png",
                 *             "title": "快手极速版",
                 *             "imgUrlList": ["https://adsfs.heytapimage.com/ads-material-depot/image/6742e86eaaf694387fe3161eb5873e5f.jpg.short.webp"]
                 *         }
                 *     ],
                 *     "code": 0,
                 *     "msg": "ok"
                 * }
                 * logoUrl不是广告的logo，而是一个广告标记，上有文字：广告
                 * imgUrlList是广告图片
                 * iconUrlList是广告的图标
                 */
                this.platObj.onLoad((ret: {adList: any[]}) => {
                    console.log('原生广告加载成功：' + this.config.name);
                    if (ret.adList != null && ret.adList.length > 0) {
                        this.clickReported = false;
                        this.clicked = false;
                        let adId = ret.adList[0].adId;
                        console.log('id:' + adId);
                        this.ad = ret.adList[0];
                        this.enable = true;
                    }
                    else {
                        this.ad = null;
                    }
                    this.loading = false;
                    if (!this.ad) {
                        setTimeout(() => {
                            if (!this.loading) {
                                this.load();
                            }
                        }, 10000);
                    }
                });
                this.platObj.onError((errCode: number, errMsg: string) => {
                    console.log('原生广告加载失败：' + JSON.stringify(errCode) + ' ' + JSON.stringify(errMsg));
                    this.ad = null;
                    this.loading = false;
                    if (!this.ad) {
                        setTimeout(() => {
                            if (!this.loading) {
                                this.load();
                            }
                        }, 10000);
                    }
                });
            }
        }
        if (this.platObj && (!this.loading || (this.lastLoadTime + 20000) < xfire.currentTimeMillis)) {
            this.loading = true;
            this.lastLoadTime = xfire.currentTimeMillis;
            this.platObj.load();
        }
    }

    public moveTo(left: number, top: number, width: number, height: number): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        if (this.nodeAd == null) {
            return;
        }
        let root = this.nodeAd.getChildByName('root');
        let containerWidth = width;
        let containerHeight = height;
        let scale = Math.min(containerWidth / 900, containerHeight / 630);
        root.scale = scale;
        root.setPosition(-cc.view.getVisibleSize().width / 2 + left + width / 2,
            cc.view.getVisibleSize().height / 2 - top - height / 2
        );
    }

    protected nativeShow(onclose: () => void): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        this.onclose = null;
        if (!this.ad) return;

        this.instantiateAd(this.ad);
        if (this.nodeAd != null && this.platObj) {
            this.onclose = onclose;
            this.nodeAd.active = true;
            this.platObj.reportAdShow({adId: this.ad.adId});
            let cb = () => {
                this.closeAd();
                xfire.offShow(cb);
            };
            // 华为要求后台返回要关闭插屏广告
            xfire.onShow(cb);
        }
    }

    protected nativeHide(): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        this.closeAd();
    }

    private closeAd(): void {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        if (this.nodeAd) {
            this.nodeAd.destroy();
            this.nodeAd = null;
            this.lblDownload = null;
            this.downloadStatus = '';
            if (this.onclose) {
                this.onclose();
                this.onclose = null;
            }
            this.platObj?.destroy?.();
            this.platObj = null;
            this.enable = false;
            this.loading = false;
            setTimeout(() => {
                this.load();
            }, 0);
        }
    }

    // tslint:disable-next-line: cyclomatic-complexity
    private instantiateAd(ad: typeof this.ad): cc.Node {
        if (xfire.plat !== xfire.PLAT_OPPO) return;
        let layerAd = xfire.getLayerNativeAd();
        if (layerAd == null) {
            console.log('异常，不存在原生广告层');
            return null;
        }
        if (this.nodeAd) {
            this.nodeAd.destroy();
            this.nodeAd = null;
            if (this.onclose) {
                this.onclose();
                this.onclose = null;
            }
        }
        this.adId = ad.adId;
        let iData: SNode = {'name': '结点_Oppo原生', 'size': [720, 1280], 'components': [{'name': 'Widget', 'properties': {'left': 0, 'top': 0, 'right': 0, 'bottom': 0, 'alignMode': null}}, {'name': 'BlockInput'}], 'children': [{'name': '黑底', 'active': false, 'color': '000000', 'opacity': 128, 'size': [720, 1280], 'components': [{'name': 'Sprite', 'properties': {'image': 'bg1x1', 'type': 0, 'sizeMode': 0}}, {'name': 'Widget', 'properties': {'left': 0, 'top': 0, 'right': 0, 'bottom': 0, 'alignMode': null}}]}, {'name': 'root', 'size': [900, 630], 'components': [{'name': 'BlockInput'}], 'children': [{'name': 'bg', 'size': [900, 630], 'components': [{'name': 'Sprite', 'properties': {'image': 'bg1x1', 'type': 0, 'sizeMode': 0}}]}, {'name': '图片', 'pos': [0, 82], 'size': [880, 446], 'components': [{'name': 'Sprite', 'properties': {'image': '', 'type': 0, 'sizeMode': 0}}, {'name': 'Widget', 'properties': {'left': 10, 'top': 10, 'right': 10, 'alignMode': null}}]}, {'name': '标题', 'color': '000000', 'pos': [-423, -220], 'anchor': [0, 0.5], 'size': [500, 70], 'components': [{'name': 'Label', 'properties': {'string': '标题', 'hAlign': 0, 'vAlign': 1, 'fontSize': 70, 'lineHeight': 75, 'overflow': 2, 'cacheMode': 0}}, {'name': 'Widget', 'properties': {'bottom': 60, 'alignMode': null}}]}, {'name': '描述', 'active': false, 'color': '000000', 'pos': [0, -259], 'size': [604, 70], 'components': [{'name': 'Label', 'properties': {'string': '描述', 'hAlign': 1, 'vAlign': 1, 'fontSize': 45, 'lineHeight': 50, 'overflow': 2, 'cacheMode': 0}}]}, {'name': '来源', 'color': '000000', 'pos': [-423, -306], 'anchor': [0, 0], 'size': [800, 50], 'components': [{'name': 'Label', 'properties': {'string': '描述', 'hAlign': 0, 'vAlign': 2, 'fontSize': 32, 'lineHeight': 40, 'overflow': 2, 'cacheMode': 0}}, {'name': 'Widget', 'properties': {'bottom': 9, 'alignMode': null}}]}, {'name': '按钮全面板', 'size': [900, 630], 'components': [{'name': 'Button', 'properties': {'transition': 0, 'normalSprite': 'default_btn_normal'}}, {'name': 'Widget', 'properties': {'left': 0, 'top': 0, 'right': 0, 'bottom': 0, 'alignMode': null}}]}, {'name': '按钮安装', 'pos': [220, -219], 'size': [220, 80], 'components': [{'name': 'Button', 'properties': {'transition': 3, 'zoomScale': 1.2, 'normalSprite': 'default_btn_normal'}}, {'name': 'Widget', 'properties': {'right': 120, 'bottom': 56, 'alignMode': null}}], 'children': [{'name': 'Background', 'color': 'd8163d', 'size': [220, 80], 'components': [{'name': 'Sprite', 'properties': {'image': '圆角矩形', 'type': 1, 'sizeMode': 0, 'slice': [11, 11, 11, 11]}}], 'children': [{'name': 'Label', 'size': [180, 63], 'components': [{'name': 'Label', 'properties': {'string': '点击安装', 'hAlign': 1, 'vAlign': 1, 'fontSize': 45, 'lineHeight': 50, 'overflow': 0, 'cacheMode': 0}}]}]}]}, {'name': '排版按钮关闭', 'pos': [399.8, -216.8], 'components': [{'name': 'Widget', 'properties': {'right': 50.19999999999999, 'bottom': 98.19999999999999, 'alignMode': null}}], 'children': [{'name': '按钮关闭', 'pos': [-1.0658141036401503e-14, 1.0658141036401503e-14], 'size': [32, 32], 'scale': [0.7, 0.7], 'components': [{'name': 'Button', 'properties': {'transition': 0, 'normalSprite': 'x3'}}], 'children': [{'name': 'Background', 'size': [90, 90], 'components': [{'name': 'Sprite', 'properties': {'image': 'x3', 'type': 0, 'sizeMode': 0}}]}]}]}, {'name': '广告标记', 'color': '000000', 'pos': [451, -316], 'anchor': [1, 0], 'size': [65, 34], 'scale': [1.5, 1.5], 'components': [{'name': 'Sprite', 'properties': {'image': '广告标记', 'type': 0, 'sizeMode': 1}}, {'name': 'Widget', 'properties': {'right': -1, 'bottom': -1, 'alignMode': null}}]}]}]};

        let node = SimpleUI.instantiate(iData, XFireAppOppo.resLoader);
        // 不模拟插屏就不能屏蔽触摸
        {
            let block = node.getComponent(cc.BlockInputEvents);
            if (block) {
                block.enabled = false;
            }
        }
        node.active = true;
        node.parent = layerAd;
        node.x = cc.view.getVisibleSize().width / 2;
        node.y = cc.view.getVisibleSize().height / 2;
        this.nodeAd = node;
        // 取出一些关键点
        let root = node.getChildByName('root');
        // 缩放
        {
            let style = this.config.style;
            let containerWidth = style.width;
            let containerHeight = style.height;
            let scale = Math.min(containerWidth / 900, containerHeight / 630);
            root.scale = scale;
            root.setPosition(-cc.view.getVisibleSize().width / 2 + style.left + style.width / 2,
                cc.view.getVisibleSize().height / 2 - style.top - style.height / 2
            );
        }
        // 标题
        {
            let nodeTitle = cc.find('root/标题', node);
            if (nodeTitle) {
                let lbl = nodeTitle.getComponent(cc.Label);
                if (lbl) {
                    lbl.string = ad.title || '';
                }
            }
        }
        // 来源
        {
            let nodeTitle = cc.find('root/来源', node);
            if (nodeTitle) {
                let lbl = nodeTitle.getComponent(cc.Label);
                if (lbl) {
                    lbl.string = ad.desc || '';
                }
            }
        }
        // 描述
        {
            let nodeDesc = cc.find('root/描述', node);
            if (nodeDesc) {
                let lbl = nodeDesc.getComponent(cc.Label);
                if (lbl) {
                    lbl.string = '';
                }
            }
        }
        // 图片
        {
            let nodeImg = cc.find('root/图片', node);
            if (nodeImg) {
                let sprite = nodeImg.getComponent(cc.Sprite);
                if (sprite) {
                    let url = ad.imgUrlList[0];
                    cc.loader.load(url, (err, tex) => {
                        let frame = new cc.SpriteFrame();
                        if (tex instanceof cc.Texture2D && err == null) {
                            frame.setTexture(tex);
                        }
                        sprite.spriteFrame = frame;
                    });
                }
            }
        }
        // 关闭按钮
        XFireAppOppo.bindButtonClickListener(cc.find('root/排版按钮关闭/按钮关闭', node), () => {
            this.closeAd();
        });
        // 关闭按钮调节触摸大小
        {
            let scale = (xfire as XFireAppOppo).feedsCloseButtonScale;
            if (this.sdkConfig.params && typeof this.sdkConfig.params.feedsCloseScale === 'number') scale *= this.sdkConfig.params.feedsCloseScale;
            let nodeClose = cc.find('root/排版按钮关闭/按钮关闭', node);
            if (nodeClose) {
                nodeClose.width *= scale;
                nodeClose.height *= scale;
            }
        }
        // 下载按钮
        {
            let nodeLabel = cc.find('root/按钮安装/Background/Label', node);
            if (nodeLabel) {
                this.lblDownload = nodeLabel.getComponent(cc.Label);
                if (this.lblDownload) {
                    this.lblDownload.string = ad.clickBtnTxt;
                }
            }
            let bindListener = (nodeButton: cc.Node) => {
                XFireAppOppo.bindButtonClickListener(nodeButton, () => {
                    if (!this.platObj) return;
                    this.clicked = true;
                    if (!this.clickReported) {
                        this.clickReported = true;
                        console.log('上报点击');
                        /** 上报会拉起落地页 */
                        this.platObj.reportAdClick({adId: this.adId});
                    }
                });
            };
            let nodeButton = cc.find('root/按钮安装', node);
            bindListener(nodeButton);
            let nodePanel = cc.find('root/按钮全面板', node);
            bindListener(nodePanel);
        }
        return node;
    }
}
