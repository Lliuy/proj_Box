/**
 * 微信小程序
 * 文档：https://developers.weixin.qq.com/minigame/dev/api/
 * PC版小游戏文档：https://developers.weixin.qq.com/minigame/dev/guide/open-ability/pc-game.html
 * 平台特性：
 *      1.必有账号
 *      2.需要域名配置
 *      3.包大小限制4M，支持分包，合计上限16M
 *      4.跳转已不受数量限制，也不需要在微信工程中配置
 *
 * PC端平台特性：
 *      1.可是自定义窗口大小
 *
 * 发布方法：
 *      1.发布为微信工程
 */

import XFireApp, { AdCfg, BannerAd, GridAd, InterstitialAd, LaunchOptions, LoginError, LoginResult, SdkCfg, ShareInfo, SystemInfo, VideoAd, XUserInfoButton, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const CC_VERSION_20 = cc.ENGINE_VERSION.indexOf('2.0.') === 0;
const CC_VERSION_21 = cc.ENGINE_VERSION.indexOf('2.1.') === 0;

// 这么做是因为模块使用者不一定有微信api的.d.ts文件
const wxapi: any = (window as any).wx;
const win: any = window;
let showOptions: LaunchOptions = null;

if (cc.sys.platform === cc.sys.WECHAT_GAME && win.qq == null && win.tt == null && (CC_VERSION_20 || CC_VERSION_21) && (typeof XH_PLAT === 'undefined' || XH_PLAT === 'wechat')) {
    console.log('替换onshow');
    let justShown = false;
    let justHidden = false;
    win._inner_onShown = (res) => {
        if (justShown) {
            return;
        }
        justShown = true;
        justHidden = false;
        if (res) {
            showOptions = { scene: 0, query: {}, referrerInfo: {} };
            if (res.query) {
                showOptions.query = res.query;
            }
            if (res.referrerInfo) {
                showOptions.referrerInfo = res.referrerInfo;
            }
            showOptions.shareTicket = res.shareTicket;
            showOptions.scene = res.scene;
        }
        if (!XFireAppWechat.getInstance()) {
            return;
        }
        if (!XFireAppWechat.getInstance().isVideoAdPlaying()) {
            cc.game.emit(cc.game.EVENT_SHOW);
            // 安卓音乐有恢复bug
            if (cc.audioEngine.isMusicPlaying()) {
                cc.audioEngine.pauseMusic();
                cc.audioEngine.resumeMusic();
            }
        }
    };
    win._inner_onHidden = () => {
        if (justHidden) {
            return;
        }
        justHidden = true;
        justShown = false;
        showOptions = null;
        if (!XFireAppWechat.getInstance()) {
            return;
        }
        if (!XFireAppWechat.getInstance().isVideoAdPlaying()) {
            cc.game.emit(cc.game.EVENT_HIDE);
        }
    };
}

export default class XFireAppWechat extends XFireApp {
    private static validateNativeUserInfoResult(res: any): XUserInfoWithSignature {
        if (!res || !res.errMsg || !res.rawData) {
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
        signature.rawData = res.rawData;
        signature.signature = res.signature;
        signature.encryptedData = res.encryptedData;
        signature.iv = res.iv;
        return new XUserInfoWithSignature(nickname, avatar, gender, signature);
    }

    private rSupportInterstitialAd = false;
    private rSupportGridAd = false;
    private sharing = false;
    private shareInfo: ShareInfo = null;
    private shareTimestamp = 0;
    /** 加速度监听函数 */
    private accCb: (res: {x: number; y: number; z: number}) => void = null;

    public constructor() {
        super();
        this.plat = this.PLAT_WECHAT;
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        this.logined = true;
        this.rSupportInterstitialAd = this.compareVersion(wxapi.getSystemInfoSync().SDKVersion, '2.6.0') >= 0;
        this.rSupportGridAd = this.compareVersion(wxapi.getSystemInfoSync().SDKVersion, '2.9.2') >= 0;
        this.supportGuestLogin = false;
        this.onShow(() => {
            if (this.sharing) {
                if (this.shareInfo != null) {
                    let timeDiff = (new Date().getTime() - this.shareTimestamp) / 1000;
                    if (timeDiff >= XFireConfigs.分享无回调平台成功限时) {
                        if (this.shareInfo.success) {
                            this.shareInfo.success();
                        }
                    }
                    else {
                        if (this.shareInfo.fail) {
                            this.shareInfo.fail();
                        }
                    }
                    if (this.shareInfo.complete) {
                        this.shareInfo.complete();
                    }
                }
            }
            this.sharing = false;
        });
        // 屏蔽微信开发者工具(2020年9月18日)的文件读取警告
        {
            let con = console as any;
            con.warnCustom = con.warn;
            con.warn = (res) => {
                if (typeof res === 'string' && res.indexOf('文件路径在真机上可能无法读取') > -1) {
                    return;
                } else {
                    con.warnCustom(res);
                }
            };
            con.groupCustom = con.group;
            con.group = (res) => {
                if (typeof res === 'string' && res.indexOf('读取文件/文件夹警告') > -1) {
                    return;
                } else {
                    con.groupCustom(res);
                }
            };
        }
    }

    public getAdSdkName(): string {
        return '微信小程序';
    }

    public supportVibrate(): boolean {
        return true;
    }

    public vibrateShort() {
        wxapi.vibrateShort();
    }

    public vibrateLong() {
        wxapi.vibrateLong();
    }

    public loadSubpackages(onProgressUpdate?: (progress: number) => void): Promise<boolean> {
        let packageCount = (window as any).__xfiresubcount;
        console.log('分包数量:' + packageCount);
        return new Promise<boolean>((resolve) => {
            if (packageCount == null || packageCount === 0) {
                if (onProgressUpdate != null) {
                    onProgressUpdate(1);
                }
                resolve(true);
                return;
            }
            let tasks = [];
            let progresses: number[] = [];
            let succCount = 0;
            // 初始化一下，防止提前访问带来Nan问题
            for (let i = 0; i < packageCount; i++) {
                progresses[i] = 0;
            }
            let createTask = (i: number) => {
                tasks[i] = wxapi.loadSubpackage({
                    name: `sub${i}`,
                    success: (res) => {
                        console.log(`分包sub${i}加载成功`);
                        succCount++;
                        if (succCount === packageCount) {
                            if (onProgressUpdate) {
                                onProgressUpdate(1);
                            }
                            resolve(true);
                            return;
                        }
                    },
                    fail: (res) => {
                        console.error(`分包加载失败:${JSON.stringify(res)}`);
                        (async () => {
                            await xfire.sleep(2);
                            createTask(i);
                        })();
                    }
                });
                // res.progress范围0-100
                tasks[i].onProgressUpdate((res: {progress: number; totalBytesWritten: number; totalBytesExpectedToWrite: number}) => {
                    progresses[i] = res.progress;
                    if (onProgressUpdate) {
                        let total = 0;
                        for (let prog of progresses) {
                            total += prog;
                        }
                        // 乘以0.999是为确保100%由成功函数发出 确保进度 逻辑一致性
                        let prog = total * 0.999 / (packageCount * 100);
                        if (prog > 0.999) {
                            prog = 0.999;
                        }
                        onProgressUpdate(prog);
                    }
                });
            };
            for (let i = 0; i < packageCount; i++) {
                createTask(i);
            }
        });
    }

    public supportLogin(): boolean {
        return true;
    }

    public supportUserInfoButton(): boolean {
        return true;
    }

    public supportMiniProgramNavigate(): boolean {
        return true;
    }

    public navigateToMiniProgram(nameOrParams: string | {
        name: string;
        path?: string;
        extraData?: any;
        success?: () => void;
        fail?: () => void;
        complete?: () => void;
    }) {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        let isName = typeof nameOrParams === 'string';
        let params: any = isName ? {} : nameOrParams;
        let name: string = isName ? nameOrParams : params.name;
        let app = this.getNavigateAppConfig(name);
        if (app == null) {
            console.error('未配置跳转app：' + name);
            return;
        }
        if (!app.enable) {
            console.error('app跳转未允许：' + name);
            return;
        }
        wxapi.navigateToMiniProgram({
            appId: app.appId,
            path: params.path,
            extraData: params.extraData,
            success(res) {
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
        success?: (authSetting: { [key: string]: boolean }) => void;
        fail?: (err) => void;
        complete?: () => void;
    }): Promise<{
        authSetting?: { [key: string]: boolean };
        error?: string;
    }> {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        return new Promise<{
            authSetting?: { [key: string]: boolean };
            error?: string;
        }>((resolve) => {
            if (!cc.sys.platform === cc.sys.WECHAT_GAME) {
                return;
            }
            let lParams = params || {};
            wxapi.getSetting({
                success: (res: any) => {
                    let result: any = {};
                    result[this.SCOPE_USERINFO] = res.authSetting[this.SCOPE_USERINFO];
                    result[this.SCOPE_USERLOCATION] = res.authSetting[this.SCOPE_USERLOCATION];
                    result[this.SCOPE_WRITEPHOTOSALBUM] = res.authSetting[this.SCOPE_WRITEPHOTOSALBUM];
                    if (lParams.success) {
                        lParams.success(result);
                    }
                    resolve({ authSetting: result });
                },
                fail: (err) => {
                    let error = JSON.stringify(err);
                    if (lParams.fail) {
                        lParams.fail(error);
                    }
                    resolve({ error });
                },
                complete: () => {
                    if (lParams.complete) {
                        lParams.complete();
                    }
                }
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        return new Promise<{
            userInfo?: XUserInfoWithSignature;
            error?: string;
        }>((resolve) => {
            if (!cc.sys.platform === cc.sys.WECHAT_GAME) {
                return;
            }
            let lParams = params || {};
            wxapi.getUserInfo({
                withCredentials: true,
                success: (res: any) => {
                    let userInfo = XFireAppWechat.validateNativeUserInfoResult(res);
                    if (lParams.success) {
                        lParams.success(userInfo);
                    }
                    resolve({ userInfo });
                },
                fail: (err) => {
                    if (lParams.fail) {
                        lParams.fail(JSON.stringify(err));
                    }
                    resolve({ error: JSON.stringify(err) });
                },
                complete: () => {
                    if (lParams.complete) {
                        lParams.complete();
                    }
                }
            });
        });
    }

    public createUserInfoButton(spaceNode: cc.Node, left: number, top: number, width: number, height: number, imagePath: string = null): XUserInfoButton {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        let rect = this.rectFromNodeToPlat(spaceNode, left, top, width, height);
        let btn = null;
        class XUserInfoButtonWechat extends XUserInfoButton {
            public constructor(platObj) {
                super(platObj);
            }

            public show(): void {
                if (this.platObj) {
                    this.platObj.show();
                }
            }

            public hide(): void {
                if (this.platObj) {
                    this.platObj.hide();
                }
            }

            public destroy(): void {
                if (this.platObj) {
                    this.platObj.destroy();
                }
            }

            protected nativeOnTap(cb: (res: import('./xfire_base').XUserInfoWithSignature) => void): void {
                if (!this.platObj) {
                    return;
                }
                if (this.nativeCallback == null) {
                    this.nativeCallback = (res: any) => {
                        let userInfo = XFireAppWechat.validateNativeUserInfoResult(res);
                        cb(userInfo);
                    };
                }
                this.platObj.onTap(this.nativeCallback);
            }

            protected nativeOffTap(cb: any): void {
                if (!this.platObj) {
                    return;
                }
                this.platObj.offTap(cb);
            }
        }
        if (imagePath != null) {
            btn = wxapi.createUserInfoButton({ type: 'image', image: imagePath, style: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } });
        }
        else {
            btn = wxapi.createUserInfoButton({ type: 'text', text: ' ', style: { left: rect.left, top: rect.top, width: rect.width, height: rect.height, backgroundColor: '#00000000' } });
        }

        return new XUserInfoButtonWechat(btn);
    }

    public supportBannerAd(): boolean {
        return true;
    }

    public supportBannerAdMove(): boolean {
        return true;
    }

    public supportVideoAd(): boolean {
        return true;
    }

    public supportInterstitialAd(): boolean {
        return this.rSupportInterstitialAd;
    }

    public supportGridAd(): boolean {
        return this.rSupportGridAd;
    }

    public supportClipboard() {
        return true;
    }

    public setClipboardData(content: string): Promise<boolean> {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        return new Promise<boolean>((resolve) => {
            wxapi.setClipboardData({
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        return new Promise<string>((resolve) => {
            wxapi.getClipboardData({
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
        return this.compareVersion(wxapi.getSystemInfoSync().SDKVersion, '1.1.0') >= 0;
    }

    public startAccelerometer() {
        if (wxapi.startAccelerometer) {
            // 微信此接口不会清理微信内的加速度监听函数
            wxapi.startAccelerometer({interval: 'game'});
            if (this.accCb == null) {
                this.accCb = (res: {x: number; y: number; z: number}) => {
                    this.dispatchAccelerometerChange(res.x, res.y, res.z, false);
                };
                wxapi.onAccelerometerChange(this.accCb);
            }
        }
    }

    public stopAccelerometer() {
        if (wxapi.stopAccelerometer) {
            // 微信此接口不会清理微信内的加速度监听函数
            wxapi.stopAccelerometer();
        }
    }

    public login(param: {
        timeout?: number;                       // 超时时间，单位ms
        success?: (res: LoginResult) => void;
        fail?: (err: LoginError) => void;
        complete?: () => void;
    } = {}): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        wxapi.login({
            success: (res: { errMsg: string; code?: string }) => {
                if (res.code) {
                    if (param.success) {
                        param.success({ plat: xfire.PLAT_WECHAT, code: res.code });
                    }
                }
                else {
                    if (param.fail) {
                        param.fail({ msg: res.errMsg });
                    }
                }
            },
            fail: () => {
                if (param.fail) {
                    param.fail({ msg: '登录失败' });
                }
            },
            complete: () => {
                if (param.complete) {
                    param.complete();
                }
            }
        });
    }

    public supportShare(): boolean {
        return true;
    }

    public showShareMenu(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        wxapi.showShareMenu();
    }

    public hideShareMenu(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        wxapi.hideShareMenu();
    }

    public shareAppMessage(shareInfo: ShareInfo): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        if (this.sharing) {
            console.log('分享中');
            return;
        }
        let info = {
            title: shareInfo.title,
            imageUrl: shareInfo.imageUrl,
            query: shareInfo.query
        };
        this.sharing = true;
        this.shareInfo = shareInfo;
        this.shareTimestamp = new Date().getTime();
        if (wxapi.aldShareAppMessage) {
            wxapi.aldShareAppMessage(info);
        }
        else {
            wxapi.shareAppMessage(info);
        }
    }

    public onShareAppMessage(cb: () => ShareInfo): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        let rcb = () => {
            let info = cb();
            this.sharing = true;
            this.shareInfo = info;
            this.shareTimestamp = new Date().getTime();
            return {
                title: info.title,
                imageUrl: info.imageUrl,
                query: info.query
            };
        };
        if (wxapi.aldOnShareAppMessage) {
            wxapi.aldOnShareAppMessage(rcb);
        }
        else {
            wxapi.onShareAppMessage(rcb);
        }
    }

    public offShareAppMessage(cb: () => ShareInfo): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        wxapi.offShareAppMessage(cb && (cb as any).rcb);
    }

    public getLaunchOptionsSync(): LaunchOptions {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        let bdOptions = wxapi.getLaunchOptionsSync();
        let ret: LaunchOptions = { scene: 0, query: {}, referrerInfo: {} };
        ret.scene = bdOptions.scene == null ? 0 : bdOptions.scene;
        if (bdOptions.query != null) {
            ret.query = bdOptions.query;
        }
        if (bdOptions.referrerInfo != null) {
            ret.referrerInfo = bdOptions.referrerInfo;
        }
        return ret;
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        return new BannerAdWechat(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        return new VideoAdWechat(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        return new InterstitialAdWechat(sdkConfig, cfg);
    }

    public createGridAd(sdkConfig: SdkCfg, cfg: AdCfg): GridAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        return new GridAdWechat(sdkConfig, cfg);
    }

    public exit() {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        wxapi.exitMiniProgram();
    }

    public setKeepScreenOn(on: boolean): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        wxapi.setKeepScreenOn({ keepScreenOn: on });
    }

    public getSystemInfoSync(): SystemInfo {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }

        let info = wxapi.getSystemInfoSync();
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

    protected nativeOnShow(cb: (options?: LaunchOptions) => void): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        cc.game.on(cc.game.EVENT_SHOW, () => {
            if (cb != null) {
                cb(showOptions);
            }
        });
    }
}

class BannerAdWechat extends BannerAd {
    // 需要展示的位置与宽高
    private movetoBox: { left: number; top: number; width: number; height: number } = null;
    private scaleToPlat = 1;
    private realSize = { width: 0, height: 0 };   // 平台单位

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        let screenSize = cc.view.getVisibleSize();
        let cfgStyle = config.style || { left: 0, bottom: 0, width: screenSize.width, height: screenSize.width / 2.917 };
        this.movetoBox = { left: cfgStyle.left, top: screenSize.height - cfgStyle.bottom - cfgStyle.height, width: cfgStyle.width, height: cfgStyle.height };
        let sysInfo = wxapi.getSystemInfoSync();
        this.scaleToPlat = sysInfo.screenWidth / screenSize.width;
        this.realSize.width = this.movetoBox.width * this.scaleToPlat;
        this.realSize.height = this.movetoBox.height * this.scaleToPlat;
    }

    public supportAutoRefresh() {
        return true;
    }

    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        // 定义style转换接口
        let genBannerAdStyle = (style: { left?: number; top?: number; width?: number; height?: number }): any => {
            return { left: style.left * this.scaleToPlat, top: style.top * this.scaleToPlat, width: style.width * this.scaleToPlat, height: style.height * this.scaleToPlat };
        };

        let style = genBannerAdStyle(this.movetoBox);
        let adIntervals = (this.config.duration || 30);
        let param = { adUnitId: this.config.id, adIntervals: adIntervals < 30 ? 30 : adIntervals, style };
        let banner = wxapi.createBannerAd(param);
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
            banner.onResize((res: any) => {
                // console.log('banner onResize：' + this.config.name + ' size：' + JSON.stringify(res));
                this.realSize.width = res.width;
                this.realSize.height = res.height;
                let dstHeight = this.movetoBox.height;
                let gheight = res.height / this.scaleToPlat;
                // 广告实际高度过高 调整宽度 使高度自动调整到预期
                if (gheight > dstHeight) {
                    banner.style.width = this.realSize.width = res.width * dstHeight / gheight;
                }
                // 广告实际高度偏小 如果alignToBottom则往下移动点
                else if (gheight < dstHeight) {
                    let dstTop = (this.movetoBox.top + this.movetoBox.height) * this.scaleToPlat - this.realSize.height;
                    banner.style.top = dstTop;
                }
                banner.style.left = this.movetoBox.left * this.scaleToPlat + (this.movetoBox.width * this.scaleToPlat - this.realSize.width) / 2;
            });
        }
    }

    // 已改为平台自己的刷新 保留做参考 [2020年03月25日 老张]
    /*public reload(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        super.reload();
        if (this.platObj == null) {
            return;
        }
        this.destroy();
        this.load();
        this.show();
    }*/

    public get size(): { width: number; height: number } {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        if (this.platObj == null) {
            return { width: 0, height: 0 };
        }
        else {
            let width = this.realSize.width / this.scaleToPlat;
            let height = this.realSize.height / this.scaleToPlat;
            return { width, height };
        }
    }

    public moveTo(bottom: number): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        let lBottom = bottom;
        if (lBottom < 0) {
            lBottom = 0;
        }
        this.movetoBox.top = cc.view.getVisibleSize().height - lBottom - this.movetoBox.height;
        if (this.movetoBox.top < 0) {
            this.movetoBox.top = 0;
        }
        if (this.platObj != null) {
            let dstTop = (this.movetoBox.top + this.movetoBox.height) * this.scaleToPlat - this.realSize.height;
            this.platObj.style.top = dstTop;
        }
    }

    public moveToEx(left: number, top: number, width: number, height: number): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        let sizeChanged = this.movetoBox.width !== width || this.movetoBox.height !== height;
        this.movetoBox = { left, top, width, height };
        if (this.platObj != null) {
            let dstLeft = left * this.scaleToPlat;
            let dstTop = (top + height) * this.scaleToPlat - this.realSize.height;
            // 不要超出屏幕上方、下方
            let platScreenHeight = cc.view.getVisibleSize().height * this.scaleToPlat;
            if (dstTop < 0) {
                dstTop = 0;
            }
            else if (dstTop > (platScreenHeight - this.realSize.height)) {
                dstTop = platScreenHeight - this.realSize.height;
            }
            let dstWidth = width * this.scaleToPlat;
            let dstHeight = height * this.scaleToPlat;
            let style = this.platObj.style;
            style.left = dstLeft + (dstWidth - this.realSize.width) / 2;
            style.top = dstTop;
            if (sizeChanged) {
                style.width = dstWidth;
                style.height = dstHeight;
            }
        }
    }

    public destroy(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        if (this.platObj == null) {
            return;
        }
        this.platObj.destroy();
        this.enable = false;
        this.visible = false;
    }

    protected nativeShow(): void {
        if (this.platObj != null) {
            this.platObj.show();
        }
    }

    protected nativeHide(): void {
        if (this.platObj != null) {
            this.platObj.hide();
        }
    }
}

class VideoAdWechat extends VideoAd {
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        let param = { adUnitId: this.config.id, multiton: true };
        let video = wxapi.createRewardedVideoAd(param);
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
        }
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        this.playCb = cb;
        if (this.platObj != null) {
            let rcb = (res: any) => {
                cc.game.emit(cc.game.EVENT_SHOW);
                this.platObj.offClose(rcb);
                if (cb) {
                    cb(res.isEnded === true);
                }
            };
            this.platObj.onClose(rcb);
            this.platObj.show().then(() => {
                console.log('视频广告展示成功：' + this.config.name);
                cc.game.emit(cc.game.EVENT_HIDE);
            }).catch((err) => {
                console.log('视频广告展示失败：' + this.config.name + ' 错误:' + JSON.stringify(err));
                this.platObj.offClose(rcb);
                this.platObj.load();
                this.enable = false;
                if (cb) {
                    cb(false);
                }
            });
        }
        else {
            if (cb) {
                cb(false);
            }
        }
    }
}

class InterstitialAdWechat extends InterstitialAd {
    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        let param = { adUnitId: this.config.id };
        let ad = wxapi.createInterstitialAd(param);
        if (ad != null) {
            this.platObj = ad;
            ad.onError((err: any) => {
                console.error('插屏广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
                // 很多错误是触发频率限制，不设置为false [2020年03月05日 老张]
                // this.enable = false;
            });
            ad.onLoad(() => {
                console.log('插屏广告加载成功：' + this.config.name);
                this.enable = true;
            });
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.show()
                .then(() => {

                }).catch((err) => {
                    console.log(err);
                });
        }
    }
}

class GridAdWechat extends GridAd {
    private bottom: number = null;      // 设置bottom是为了实现主动移动grid位置
    private scaleToPlat = 1;

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        if (config.style == null || config.style.bottom == null) {
            this.bottom = 0;
        }
        else {
            this.bottom = config.style.bottom;
        }
        if (this.bottom < 0) {
            this.bottom = 0;
        }
        let sysInfo = wxapi.getSystemInfoSync();
        this.scaleToPlat = sysInfo.screenWidth / cc.view.getVisibleSize().width;
    }

    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        // 定义微信相关接口
        let sysInfo = wxapi.getSystemInfoSync();
        let genBannerAdStyle = (style: { left?: number; bottom?: number; width?: number; height?: number }): any => {
            let ratio = cc.view.getVisibleSize().width / sysInfo.screenWidth;
            let left = style.left;
            let top = cc.view.getVisibleSize().height - style.height - this.bottom;
            return { left: left / ratio, top: top / ratio, width: style.width / ratio, height: style.height / ratio };
        };
        let style = genBannerAdStyle(this.config.style);
        let param = {
            adUnitId: this.config.id,
            adTheme: 'white',
            adIntervals: 30,
            gridCount: 5,
            style
        };
        console.log(style);
        let ad = wxapi.createGridAd(param);
        if (ad != null) {
            console.log('创建格子广告成功');
            this.platObj = ad;
            ad.onError((err: any) => { console.log(err); this.enable = false; });
            ad.onLoad(() => {
                this.enable = true;
                if (this.toShow) {
                    this.show();
                }
            });
            ad.onResize((res: any) => {
                let gheight = res.height / this.scaleToPlat;
                // 高度过高 调整宽度 使高度自动调整到预期
                if (gheight > this.config.style.height) {
                    ad.style.width = res.width * this.config.style.height / gheight;
                    ad.style.left = (cc.view.getVisibleSize().width * this.scaleToPlat - ad.style.width) / 2;
                }
                // 高度偏小 底部上缩 这里纵向移动对齐底部位置
                else if (gheight < this.config.style.height) {
                    let top = (cc.view.getVisibleSize().height - this.bottom) * this.scaleToPlat - res.height;
                    ad.style.top = top;
                }
            });
        }
        else {
            console.log('创建格子广告失败');
            this.platObj = null;
            this.enable = false;
        }
    }

    public get size(): { width: number; height: number } {
        if (this.platObj == null) {
            return { width: 0, height: 0 };
        }
        else {
            let width = this.platObj.style.width / this.scaleToPlat;
            let height = this.platObj.style.height / this.scaleToPlat;
            return { width, height };
        }
    }

    public moveTo(bottom: number): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_WECHAT) {
            return;
        }
        this.bottom = bottom == null ? 0 : bottom;
        if (this.bottom < 0) {
            this.bottom = 0;
        }
        if (this.platObj != null) {
            let height = this.platObj.style.height / this.scaleToPlat;
            if ((this.bottom + height) > cc.view.getVisibleSize().height) {
                this.bottom = cc.view.getVisibleSize().height - height;
            }
            this.platObj.style.top = (cc.view.getVisibleSize().height - this.bottom) * this.scaleToPlat - this.platObj.style.height;
        }
    }

    public destroy(): void {
    }

    public update(dt: number, idleTime: number): void {
    }

    protected nativeShow(): void {
        if (this.platObj != null) {
            this.platObj.show();
        }
    }

    protected nativeHide(): void {
        if (this.platObj != null) {
            this.platObj.hide();
        }
    }
}
