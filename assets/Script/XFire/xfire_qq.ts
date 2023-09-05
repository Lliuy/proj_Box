/**
 * qq小程序
 * 接口文档地址https://q.qq.com/wiki/develop/game/API/
 * QQ钱包商户平台：
 *      https://qpay.qq.com/buss/wiki/221/1219
 *      红包创建：https://qpay.qq.com/buss/wiki/221/1220
 *      开屏广告申请（2020年11月3日）：https://docs.qq.com/form/page/DSnh5RU1GQWFKaXFW?_w_tencentdocx_form=1#/fill-detail
 * 平台特性：
 *      1.账号必有
 *      2.需要配置域名
 *      3.支持分包，首场景加载工程不可使用分包中内容
 *      4.插屏在游戏启动一定时间内不能弹出，两次插屏有间隔时长限制
 *
 * 开屏广告配置2020年8月13日：https://support.qq.com/products/134621/faqs/71745
 *      ✦使用新版打包插件构建
 *      ✦当前（2020年9月9日）需使用Nightly Build版，stable版本还不支持
 *      ✦发布后在后台建立loading广告位即可，【发布成功后才会出现】
 *
 * 发布方法：
 *      1.发布为微信工程
 *      2.使用qq开发工具打开微信工程
 *
 * 平台问题：
 *      1.同一周期内使用qq api接口对一个广告进行隐藏-显示-隐藏会产生内部错误，导致广告不再能被隐藏。
 *
 */

import XFireApp, { AdCfg, AppBoxAd, AppConfig, BannerAd, BlockAd, InterstitialAd, LaunchOptions, LoginError, LoginResult, OrderInfo, SdkCfg, ShareInfo, SystemInfo, VideoAd, XFeedbackButton, XUserInfoButton, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const CC_VERSION_20 = cc.ENGINE_VERSION.indexOf('2.0.') === 0;
const CC_VERSION_21 = cc.ENGINE_VERSION.indexOf('2.1.') === 0;
const ORDER_MARK = '_qq_order_consumed_mark_';

// 这么做是因为模块使用者不一定有微信api的.d.ts文件
const qqapi: any = (window as any).qq;
let win: any = window;
let showOptions: LaunchOptions = null;

if (cc.sys.platform === cc.sys.WECHAT_GAME && win.qq != null && win.tt == null && (CC_VERSION_20 || CC_VERSION_21) && (typeof XH_PLAT === 'undefined' || XH_PLAT === 'qq')) {
    let justShown = false;
    let justHidden = false;
    win._inner_onShown = (res) => {
        if (justShown) {
            return;
        }
        justShown = true;
        justHidden = false;
        if (res) {
            showOptions = {scene: 0, query: {}, referrerInfo: {}};
            if (res.query) {
                showOptions.query = res.query;
            }
            if (res.referrerInfo) {
                showOptions.referrerInfo = res.referrerInfo;
            }
            showOptions.shareTicket = res.shareTicket;
            showOptions.scene = res.scene;
        }
        if (!XFireAppQQ.getInstance()) {
            return;
        }
        if (!XFireAppQQ.getInstance().isVideoAdPlaying()) {
            cc.game.emit(cc.game.EVENT_SHOW);
        }
    };
    win._inner_onHidden = () => {
        if (justHidden) {
            return;
        }
        justHidden = true;
        justShown = false;
        showOptions = null;
        if (!XFireAppQQ.getInstance()) {
            return;
        }
        if (!XFireAppQQ.getInstance().isVideoAdPlaying()) {
            cc.game.emit(cc.game.EVENT_HIDE);
        }
    };
}

export default class XFireAppQQ extends XFireApp{
    private static validateNativeUserInfoResult(res: any): XUserInfoWithSignature {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
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

    private sharing = false;
    private shareInfo: ShareInfo = null;
    private shareTimestamp = 0;

    /** 加速度监听函数 */
    private accCb: (res: {x: number; y: number; z: number}) => void = null;

    public constructor() {
        super();
        this.plat = this.PLAT_QQ;
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        this.logined = true;
        this.rSupportInterstitialAd = this.compareVersion(qqapi.getSystemInfoSync().SDKVersion, '1.8.6') >= 0;
        console.log(this.rSupportInterstitialAd ? '支持插屏' : '不支持插屏');
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || qqapi == null) {
            console.error('XFireAppQQ只可在QQ环境下使用');
        }

        this.startPayMonitor();
    }

    public getAdSdkName(): string {
        return 'qq小程序';
    }

    public supportVibrate(): boolean {
        return true;
    }

    public vibrateShort() {
        qqapi.vibrateShort();
    }

    public vibrateLong() {
        qqapi.vibrateLong();
    }

    /** 添加彩签，基础库1.10.0开始支持 */
    public addColorSign(_params?: {
        success?: () => void;
        fail?: () => void;
        complete?: () => void;
    }) {
        let params = _params || {};
        if (qqapi.addColorSign) {
            qqapi.addColorSign({
                success: params.success,
                fail: params.fail,
                complete: params.complete
            });
        }
    }

    /** 判断是否已在彩签内，基础库1.16.0开始支持 */
    public isColorSignExistSync(): boolean {
        if (qqapi.isColorSignExistSync) {
            return qqapi.isColorSignExistSync();
        }
        return false;
    }

    /** 当前（2020年10月21日）qq开发者工具多个分包不允许并发加载，会提示找不到game.js，真机没问题 */
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
                tasks[i] = qqapi.loadSubpackage({
                    name: `sub${i}`,
                    success: (res) => {
                        console.log(`分包sub${i}加载成功`);
                        succCount++;
                        progresses[i] = 100;
                        if (succCount === packageCount) {
                            if (onProgressUpdate) {
                                onProgressUpdate(1);
                            }
                            resolve(true);
                            return;
                        }
                        else {
                            createTask(i + 1);
                        }
                    },
                    fail: (res) => {
                        (async () => {
                            await xfire.sleep(2);
                            createTask(i);
                        })();
                    }
                });
                // res.progress范围0-100
                tasks[i].onProgressUpdate((res: {progress: number; totalBytesWritten: number; totalBytesExpectedToWrite: number}) => {
                    let progress = res.progress;
                    if (progress === 0 && typeof res.totalBytesWritten === 'number' && typeof res.totalBytesExpectedToWrite === 'number' && res.totalBytesExpectedToWrite > 0) {
                        progress = res.totalBytesWritten * 100 / res.totalBytesExpectedToWrite;
                    }
                    progresses[i] = progress;
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
            createTask(0);
        });
    }

    public supportLogin(): boolean {
        return true;
    }

    public supportUserInfoButton(): boolean {
        return true;
    }

    public supportFeedbackButton(): boolean {
        return qqapi.createFeedbackButton != null;
    }

    public supportMiniProgramNavigate(): boolean {
        return false;
    }

    public navigateToMiniProgram(nameOrParams: string | {
        name: string;
        path?: string;
        extraData?: any;
        success?: () => void;
        fail?: () => void;
        complete?: () => void;
    }) {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
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
        qqapi.navigateToMiniProgram({
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
        success?: (authSetting: {[key: string]: boolean}) => void;
        fail?: (err) => void;
        complete?: () => void;
    }): Promise<{
        authSetting?: {[key: string]: boolean};
        error?: string;
    }> {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        return new Promise<{
            authSetting?: {[key: string]: boolean};
            error?: string;
        }>((resolve) => {
            if (!cc.sys.platform === cc.sys.WECHAT_GAME) {
                return;
            }
            let lParams = params || {};
            qqapi.getSetting({
                success: (res: any) => {
                    let result: any = {};
                    result[this.SCOPE_USERINFO] = res.authSetting[this.SCOPE_USERINFO];
                    result[this.SCOPE_USERLOCATION] = res.authSetting[this.SCOPE_USERLOCATION];
                    result[this.SCOPE_WRITEPHOTOSALBUM] = res.authSetting[this.SCOPE_WRITEPHOTOSALBUM];
                    if (lParams.success) {
                        lParams.success(result);
                    }
                    resolve({authSetting: result});
                },
                fail: (err) => {
                    let error = JSON.stringify(err);
                    if (lParams.fail) {
                        lParams.fail(error);
                    }
                    resolve({error});
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
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
            qqapi.getUserInfo({
                withCredentials: true,
                success: (res: any) => {
                    let userInfo = XFireAppQQ.validateNativeUserInfoResult(res);
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

    public createUserInfoButton(spaceNode: cc.Node, left: number, top: number, width: number, height: number,  imagePath: string = null): XUserInfoButton {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let rect = this.rectFromNodeToPlat(spaceNode, left, top, width, height);
        let btn = null;
        class XUserInfoButtonQQ extends XUserInfoButton {
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
                        let userInfo = XFireAppQQ.validateNativeUserInfoResult(res);
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
            btn = qqapi.createUserInfoButton({ type: 'image', image: imagePath, style: {left: rect.left, top: rect.top, width: rect.width, height: rect.height}});
        }
        else {
            btn = qqapi.createUserInfoButton({ type: 'text', text: ' ', style: { left: rect.left, top: rect.top, width: rect.width, height: rect.height, backgroundColor: '#00000000' } });
        }

        return new XUserInfoButtonQQ(btn);
    }

    public createFeedbackButton(spaceNode: cc.Node, left: number, top: number, width: number, height: number,  imagePath: string = null): XFeedbackButton {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let rect = this.rectFromNodeToPlat(spaceNode, left, top, width, height);
        let btn = null;
        class XFeedbackButtonQQ extends XFeedbackButton {
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

            protected nativeOnTap(cb: () => void): void {
                if (!this.platObj) {
                    return;
                }
                if (this.nativeCallback == null) {
                    this.nativeCallback = () => {
                        cb();
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
            btn = qqapi.createFeedbackButton({ type: 'image', image: imagePath, style: {left: rect.left, top: rect.top, width: rect.width, height: rect.height}});
        }
        else {
            btn = qqapi.createFeedbackButton({ type: 'text', text: ' ', style: { left: rect.left, top: rect.top, width: rect.width, height: rect.height, backgroundColor: '#00000000'/*rgba*/ } });
        }

        return new XFeedbackButtonQQ(btn);
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
        return this.rSupportInterstitialAd && qqapi.createInterstitialAd != null;
    }

    public supportAppBoxAd(): boolean {
        return qqapi && qqapi.createAppBox;
    }

    public supportBlockAd(): boolean {
        return qqapi && qqapi.createBlockAd;
    }

    public supportPayment(): boolean {
        return qqapi.getSystemInfoSync().platform !== 'ios';
    }

    public supportClipboard() {
        return true;
    }

    public setClipboardData(content: string): Promise<boolean> {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        return new Promise<boolean> ((resolve) => {
            qqapi.setClipboardData({
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        return new Promise<string> ((resolve) => {
            qqapi.getClipboardData({
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
        return true;
    }

    public startAccelerometer() {
        if (qqapi.startAccelerometer) {
            // qq此接口不会清理微信内的加速度监听函数
            qqapi.startAccelerometer({interval: 'game'});
            if (this.accCb == null) {
                this.accCb = (res: {x: number; y: number; z: number}) => {
                    this.dispatchAccelerometerChange(res.x, res.y, res.z, false);
                };
                qqapi.onAccelerometerChange(this.accCb);
            }
        }
    }

    public stopAccelerometer() {
        if (qqapi.stopAccelerometer) {
            // qq此接口不会清理微信内的加速度监听函数
            qqapi.stopAccelerometer();
        }
    }

    public login(param: {
            timeout?: number;                       // 超时时间，单位ms
            success?: (res: LoginResult) => void;
            fail?: (err: LoginError) => void;
            complete?: () => void;
        }= {}): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        qqapi.login({
            success: (res: {errMsg: string; code?: string}) => {
                if (res.code) {
                    if (param.success) {
                        param.success({plat: xfire.PLAT_QQ, code: res.code});
                    }
                }
                else {
                    if (param.fail) {
                        param.fail({msg: res.errMsg});
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

    public supportShare(): boolean {
        return true;
    }

    public showShareMenu(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        qqapi.showShareMenu();
    }

    public hideShareMenu(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        qqapi.hideShareMenu();
    }

    public shareAppMessage(shareInfo: ShareInfo): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        if (this.sharing) {
            console.log('分享中');
            return;
        }
        let info = {
            title: shareInfo.title,
            imageUrl: shareInfo.imageUrl,
            query: shareInfo.query,
            success: (res) => {console.log('分享a成功', res); },
            fail: () => {console.log('分享a失败'); },
            complete: () => {console.log('分享a完成'); }
        };
        this.sharing = true;
        this.shareInfo = shareInfo;
        this.shareTimestamp = new Date().getTime();
        // if (qqapi.aldShareAppMessage) {
        //    qqapi.aldShareAppMessage(info);
        // }
        // else {
        qqapi.shareAppMessage(info);
        // }
    }

    public onShareAppMessage(cb: () => ShareInfo): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
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
        // if (qqapi.aldOnShareAppMessage) {
        //    qqapi.aldOnShareAppMessage(rcb);
        // }
        // else {
        qqapi.onShareAppMessage(rcb);
        // }
    }

    public offShareAppMessage(cb: () => ShareInfo): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        qqapi.offShareAppMessage(cb && (cb as any).rcb);
    }

    public getLaunchOptionsSync(): LaunchOptions {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let bdOptions = qqapi.getLaunchOptionsSync();
        let ret: LaunchOptions = {scene: 0, query: {}, referrerInfo: {}};
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        return new BannerAdQQ(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        return new VideoAdQQ(sdkConfig, cfg);
    }

    public createAppBoxAd(sdkConfig: SdkCfg, cfg: AdCfg): AppBoxAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        return new AppBoxAdQQ(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        return new InterstitialAdQQ(sdkConfig, cfg);
    }

    public createBlockAd(sdkConfig: SdkCfg, cfg: AdCfg): BlockAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        return new BlockAdQQ(sdkConfig, cfg);
    }

    public exit() {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        qqapi.exitMiniProgram();
    }

    public setKeepScreenOn(on: boolean): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        qqapi.setKeepScreenOn({keepScreenOn: on});
    }

    public getSystemInfoSync(): SystemInfo {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }

        let info = qqapi.getSystemInfoSync();
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

    protected async nativePay(orderid: string, goodsName: string, count: number, price: number, goodsId: string) {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let orderInfo: OrderInfo = {orderid, goodsName, goodsId, count: count == null ? 1 : count, price};
        // 先预下单
        let result = await this.httpGetJsonWithBody('https://minigame.orbn.top/minigame/pay/qqmini/prepay', {
            id: this.userid,
            session: this.userSession,
            goodsId,
            goodsName,
            count,
            price
        });
        // 再加一次判断，因为异步问题导致代码压缩光头部的返回不符合预期
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        if (result.error || result.json == null || result.json.result !== 'ok') {
            console.log(result);
            return;
        }
        orderInfo.orderid = result.json.data.orderid;
        // 启动支付
        qqapi.requestMidasPayment({
            prepayId: result.json.data.prepayId,
            setEnv: result.json.data.test ? 1 : 0,
            starCurrency: Math.floor(price * 10),
            success: (res) => {
                console.log('pay succ:' + xfire.currentTimeMillis);
                this.consumeGoods(orderInfo.orderid, orderInfo);
            },
            fail: (res) => {
                console.log('pay fail:' + xfire.currentTimeMillis);
                let err = '';
                let cancel = false;
                let doCancelOrder = () => {
                    this.httpGetJsonWithBody('https://minigame.orbn.top/minigame/pay/qqmini/cancel', {
                                id: this.userid,
                                session: this.userSession,
                                orderid: result.json.data.orderid
                            });
                };
                if (res) {
                    switch (res.errCode) {
                        case -1: err = '系统错误'; break;
                        case -2:
                            err = '用户取消支付';
                            cancel = true;
                            doCancelOrder();
                            break;
                        case -3:
                            err = '米大师充值失败';
                            doCancelOrder();
                            break;
                        case -4: err = '米大师消耗失败'; break;
                        case -1000: err = '参数错误'; break;
                        default:
                            break;
                    }
                }
                console.log('支付失败:' + err, res);
                if (this.payNotifier) {
                    if (cancel && this.payNotifier.cancel) {
                        this.payNotifier.cancel(orderInfo);
                    }
                    else if (!cancel && this.payNotifier.fail) {
                        this.payNotifier.fail(orderInfo, err);
                    }
                }
            }
        });
    }

    protected nativeOnShow(cb: (options?: LaunchOptions) => void): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        cc.game.on(cc.game.EVENT_SHOW, () => {
            if (cb != null) {
                cb(showOptions);
            }
        });
    }

    /**
     * 启动支付监视器，处理未消耗物品
     */
    private startPayMonitor() {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let goodsListFetched = false;
        (async () => {
            while (true) {
                await this.sleep(3);
                if (this.userid == null || this.userid === '' || this.userSession == null || this.userSession === '' || this.payNotifier == null) {
                    continue;
                }
                if (goodsListFetched) {
                    continue;
                }
                let ret = await this.httpGetJsonWithBody('https://minigame.orbn.top/minigame/pay/qqmini/getMyGoods', {
                    id: this.userid,
                    session: this.userSession
                });
                if (ret != null && ret.error == null && ret.json.result === 'ok') {
                    goodsListFetched = true;
                    for (let goods of ret.json.data.goodsList) {
                        this.consumeGoods(goods.orderid);
                        await this.sleep(1);
                    }
                }
            }
        })();
    }

    private async consumeGoods(orderid: string, orderInfo?: OrderInfo) {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        if (!this.payNotifier || !this.payNotifier.success) {
            return;
        }
        let consumed = this.isOrderConsumed(orderid);
        // 先发放好了，减少意外
        if (orderInfo && !consumed) {
            this.payNotifier.success(orderInfo);
            this.markOrderConsumed(orderid);
        }
        // 抹去服务器记录
        let ret = await this.httpGetJsonWithBody('https://minigame.orbn.top/minigame/pay/qqmini/consumeGoods', {
            id: this.userid,
            session: this.userSession,
            orderid
        });
        if (orderInfo || ret == null || ret.error != null || ret.json.result !== 'ok') {
            return;
        }

        let order = ret.json.data;
        if (!consumed && this.payNotifier && this.payNotifier.success) {
            this.payNotifier.success(order);
            this.markOrderConsumed(orderid);
        }
    }

    private markOrderConsumed(orderid: string): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let key = ORDER_MARK + orderid;
        cc.sys.localStorage.setItem(key, 'true');
    }

    private isOrderConsumed(orderid: string): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let key = ORDER_MARK + orderid;
        return cc.sys.localStorage.getItem(key) === 'true';
    }
}

class BannerAdQQ extends BannerAd{
    // 需要展示的位置与宽高
    private movetoBox: {left: number; top: number; width: number; height: number} = null;
    private scaleToPlat = 1;
    private realSize = {width: 0, height: 0};   // 平台单位

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let screenSize = cc.view.getVisibleSize();
        let cfgStyle = config.style || {left: 0, bottom: 0, width: screenSize.width, height: screenSize.width / 2.917};
        this.movetoBox = {left: cfgStyle.left, top: screenSize.height - cfgStyle.bottom - cfgStyle.height, width: cfgStyle.width, height: cfgStyle.height};
        let sysInfo = qqapi.getSystemInfoSync();
        this.scaleToPlat = sysInfo.screenWidth / screenSize.width;
        this.realSize.width = this.movetoBox.width * this.scaleToPlat;
        this.realSize.height = this.movetoBox.height * this.scaleToPlat;
    }

    public supportAutoRefresh() {
        return false;
    }

    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        // 定义相关接口
        let genBannerAdStyle = (style: {left?: number; top?: number; width?: number; height?: number}): any => {
            return {left: style.left * this.scaleToPlat, top: style.top * this.scaleToPlat, width: style.width * this.scaleToPlat, height: style.height * this.scaleToPlat};
        };

        let style = genBannerAdStyle(this.movetoBox);
        // 因为目前（2020年8月17日）qq不支持平台自行刷新，展示屏蔽adIntervals参数
        let adIntervals = (this.config.duration || 30);
        let param = {adUnitId: this.config.id, /*adIntervals: adIntervals < 30 ? 30 : adIntervals,*/ style};
        let banner = qqapi.createBannerAd(param);
        this.platObj = banner;
        if (banner == null) {
            console.log('创建banner失败：' + this.config.name);
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

    public reload(): void {
        // 当前（2020年10月10日）ios下刷新banner会出现banner消失的问题
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ || qqapi.getSystemInfoSync().platform === 'ios') {
            return;
        }
        super.reload();
        if (this.platObj == null) {
            return;
        }
        this.destroy();
        this.load();
        this.show();
    }

    public get size(): {width: number; height: number} {
        if (this.platObj == null) {
            return {width: 0, height: 0};
        }
        else {
            let width = this.realSize.width / this.scaleToPlat;
            let height = this.realSize.height / this.scaleToPlat;
            return {width, height};
        }
    }

    public moveTo(bottom: number): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let sizeChanged = this.movetoBox.width !== width || this.movetoBox.height !== height;
        this.movetoBox = {left, top, width, height};
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
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

class VideoAdQQ extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let param = {adUnitId: this.config.id};
        let video = qqapi.createRewardedVideoAd(param);
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        this.playCb = cb;
        if (this.platObj != null) {
            let rcb = (res: any) => {
                console.log(res);
                cc.game.emit(cc.game.EVENT_SHOW);
                this.platObj.offClose(rcb);
                if (cb) {
                    cb(res.isEnded === true || res.isEnded === 1);
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

class AppBoxAdQQ extends AppBoxAd{
    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let param = {adUnitId: this.config.id};
        let box = qqapi.createAppBox(param);
        this.platObj = box;
        if (box == null) {
            console.log('创建box失败');
        }
        else {
            console.log('创建box成功');
            box.load().then(() => {
                this.enable = true;
            }).catch((error) => {
                this.enable = false;
            });
        }
    }

    public update(dt: number, idleTime: number): void {
    }

    public destroy(): void {
    }

    protected nativeShow(): void {
        if (this.platObj) {
            this.platObj.show();
        }
    }
}

class InterstitialAdQQ extends InterstitialAd {
    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let param = {adUnitId: this.config.id};
        let ad = qqapi.createInterstitialAd(param);
        if (ad != null) {
            console.log('创建插屏成功');
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
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

class BlockAdQQ extends BlockAd {
    private left: number = null;
    private top: number = null;
    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
            return;
        }
        let style = xfire.copy(this.config.style);
        if (this.left != null) {
            style.left = this.left;
            style.top = this.top;
        }
        else {
            this.left = style.left || 0;
            this.top = style.top || 0;
        }
        let scaleToPlat = xfire.getSystemInfoSync().screenWidth / cc.winSize.width;
        let param = {adUnitId: this.config.id, style: {left: style.left * scaleToPlat, top: style.top * scaleToPlat}, size: style.size || 1, orientation: style.orientation || 'landscape'};
        let ad = qqapi.createBlockAd(param);
        if (ad != null) {
            console.log('创建积木广告成功');
            this.platObj = ad;
            ad.onError((err: any) => {
                console.error('积木广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
                this.enable = false;
            });
            ad.onLoad(() => {
                console.log('积木广告加载成功：' + this.config.name);
                this.enable = true;
                if (this.toShow) {
                    this.show();
                }
            });
            ad.onResize((res: {width: number; height: number}) => {
                // console.log(JSON.stringify(res));
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

    public moveTo(left: number, top: number): void {
        this.left = left;
        this.top = top;
        if (this.platObj && this.platObj.style) {
            let scaleToPlat = xfire.getSystemInfoSync().screenWidth / cc.winSize.width;
            this.platObj.style.left = scaleToPlat * left;
            this.platObj.style.top = scaleToPlat * top;
        }
    }

    protected nativeShow(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QQ) {
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

    protected nativeHide(): void {
        if (this.platObj != null) {
            if (this.platObj.hide != null) {
                this.platObj.hide();
            }
            else {
                this.platObj.destroy();
                this.enable = false;
                this.load();
            }
        }
    }
}
