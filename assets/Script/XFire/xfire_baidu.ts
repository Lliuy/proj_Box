/**
 * 百度小程序
 * 文档：https://smartprogram.baidu.com/docs/game/api/openApi/authorize/
 * 广告后台：https://mssp.baidu.com/bqt#/
 * 平台特性：
 *      1.账号非必有，登录有弹窗，可不支持游客登录
 *      2.包大小限制4M，支持分包，合计8M
 *
 * 调试方法:
 *      1.发布时勾选调试模式、sourcemap
 *      2.百度开发者面板右下角Sources面板，工程代码位于webpack://source/assets/下
 *
 * 发布方法：
 *      1.发布为百度工程
 *      2.使用百度开发者工具打开
 *      3.基础库统一设置为1.1.5
 *
 * 引擎定制：
 *      1.为了统一中断处理行为，需修改baidu-adapter下的document.js，并在Game.js中屏蔽多余的onShow
 *
 */

import XFireApp, { AdCfg, BannerAd, LaunchOptions, LoginError, LoginResult, SdkCfg, ShareInfo, SystemInfo, VideoAd, XUserInfoButton, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const CC_VERSION_20 = cc.ENGINE_VERSION.indexOf('2.0.') === 0;
const CC_VERSION_21 = cc.ENGINE_VERSION.indexOf('2.1.') === 0;
const BaiduBannerRatio = 3;   // 百度banner固定为3：1宽高比

// 这么做是因为模块使用者不一定有百度api的.d.ts文件
const swan: any = (window as any).swan;
let global: any = (window as any).GameGlobal;
let showOptions: LaunchOptions = null;

if (!cc.sys.platform === cc.sys.WECHAT_GAME && swan != null && (CC_VERSION_20 || CC_VERSION_21)) {
    console.log('替换onshow');
    let justShown = false;
    let justHidden = false;
    global._inner_onShown = (res) => {
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
        if (!XFireAppBaidu.getInstance()) {
            return;
        }
        console.log('v state:' + XFireAppBaidu.getInstance().isVideoAdPlaying());
        if (!XFireAppBaidu.getInstance().isVideoAdPlaying()) {
            global._inner_onShown_origin();
        }
    };
    global._inner_onHidden = () => {
        if (justHidden) {
            return;
        }
        justHidden = true;
        justShown = false;
        showOptions = null;
        if (!XFireAppBaidu.getInstance()) {
            return;
        }
        console.log('v state:' + XFireAppBaidu.getInstance().isVideoAdPlaying());
        if (!XFireAppBaidu.getInstance().isVideoAdPlaying()) {
            global._inner_onHidden_origin();
        }
    };
}

export default class XFireAppBaidu extends XFireApp{
    /**
     * 规范化用户信息
     * @param res 示例：{
     * "errno":0,
     * "error":"",
     * "data":"OVt66WqqoK9j3iE8mlcOo/+6bUuTaUJQTWrKX/P0NT4oCSNQghFeYD6ffhUV3B9MU8tzGvaL0hu1dreI++oFHYb7WT3FT40kn9JW9pdlIbSSR0eheVhCVXCS/JIm4bDQhKikhhdyajjCjOBd3Cf82c6QkDKzF2QB4WC2YoTSN6vfQoVDPtf5CCEIHe+zif9Atd+K4kG0WIJpZD1gbzc54uv9tLb68URvRh9oUz8icTn3vlLFTMmcM4wJgtzJQQNbnj9nWwxrbCMqwsBbyFE0H/ls5B4exJEwcJQbQq+G4DQ=",
     * "iv":"e4e9449da2b5c70a277b5Q==",
     * "swanid":"SeLJtNZBUuiaU3ELD9yTaQ4J8YnpRDVWBtSFhADrokxVtnU84YNnD6NbgxvtnMogG6xYAm4daV9UPTSaMDGcrytzA",
     * "swanid_signature":"3eaedc47df8ec92ad75442f5cd4fb28e",
     * "swanid_old":"",
     * "swanid_old_signature":"",
     * "is_anonymous":false,
     * "userInfo":{"nickName":"泼猴德拉","avatarUrl":"https://himg.bdimg.com/sys/portrait/item/06f4646170616f5f616930303e03","gender":1}}
     */
    private static validateNativeUserInfoResult(res: any): XUserInfoWithSignature {
        console.log(JSON.stringify(res));
        if (!res || !res.data) {
            return null;
        }
        let userInfo = res.userInfo;
        let nickname = userInfo ? userInfo.nickName : '';
        let avatar = userInfo ? userInfo.avatarUrl : '';
        let gender = userInfo ? userInfo.gender : '';
        switch (gender) {
            case 1: gender = '男'; break;
            case 2: gender = '女'; break;
        }
        let signature: any = {};
        signature.data = res.data;
        signature.iv = res.iv;
        return new XUserInfoWithSignature(nickname, avatar, gender, signature);
    }

    public constructor() {
        super();
        this.plat = this.PLAT_BAIDU;
        if (cc.sys.platform !== cc.sys.BAIDU_GAME) {
            console.error('XFireAppBaidu只可在百度小程序环境下使用');
        }
    }

    public getAdSdkName(): string {
        return '百度小程序';
    }

    public supportVibrate(): boolean {
        return true;
    }

    public vibrateShort() {
        swan.vibrateShort();
    }

    public vibrateLong() {
        swan.vibrateLong();
    }

    public supportLogin(): boolean {
        return true;
    }

    public platLogined(): boolean {
        if (this.logined) {
            return true;
        }
        let logined = false;
        if (swan.isLoginSync) {
            let res = swan.isLoginSync();
            logined = res && res.isLogin;
        }
        return logined || cc.sys.localStorage.getItem(XFireConfigs.平台账号登录标记) === 'true';
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
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
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
        swan.navigateToMiniProgram({
            appKey: app.appId,
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
        return new Promise<{
            authSetting?: {[key: string]: boolean};
            error?: string;
        }>((resolve) => {
            if (cc.sys.platform === cc.sys.WECHAT_GAME) {
                return;
            }
            let lParams = params || {};
            swan.getSetting({
                success: (res: any) => {
                    let result: any = {};
                    result[this.SCOPE_USERINFO] = res.authSetting[this.SCOPE_USERINFO];
                    result[this.SCOPE_USERLOCATION] = res.authSetting[this.SCOPE_USERLOCATION];
                    result[this.SCOPE_WRITEPHOTOSALBUM] = res.authSetting[this.SCOPE_WRITEPHOTOSALBUM];
                    result[this.SCOPE_CAMERA] = res.authSetting[this.SCOPE_CAMERA];
                    result[this.SCOPE_RECORD] = res.authSetting[this.SCOPE_RECORD];
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
        return new Promise<{
            userInfo?: XUserInfoWithSignature;
            error?: string;
        }> ((resolve) => {
            if (cc.sys.platform === cc.sys.WECHAT_GAME) {
                return;
            }
            let lParams = params || {};
            swan.getUserInfo({
                success: (res: any) => {
                    let userInfo = XFireAppBaidu.validateNativeUserInfoResult(res);
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
        let rect = this.rectFromNodeToPlat(spaceNode, left, top, width, height);
        let btn = null;
        let that = this;
        class XUserInfoButtonBaidu extends XUserInfoButton {
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
                        let userInfo = XFireAppBaidu.validateNativeUserInfoResult(res);
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
            btn = swan.createUserInfoButton({ type: 'image', image: imagePath, style: {left: rect.left, top: rect.top, width: rect.width, height: rect.height}});
        }
        else {
            btn = swan.createUserInfoButton({ type: 'text', text: ' ', style: { left: rect.left, top: rect.top, width: rect.width, height: rect.height, backgroundColor: '#00000000' } });
        }

        return new XUserInfoButtonBaidu(btn);
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
        return false;
    }

    public supportClipboard() {
        return true;
    }

    public setClipboardData(content: string): Promise<boolean> {
        return new Promise<boolean> ((resolve) => {
            swan.setClipboardData({
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
            swan.getClipboardData({
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
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        swan.login({
            success: (res: {errMsg: string; code?: string}) => {
                this.logined = true;
                cc.sys.localStorage.setItem(XFireConfigs.平台账号登录标记, 'true');
                if (res.code) {
                    if (param.success) {
                        param.success({plat: this.plat, code: res.code});
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
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        swan.showShareMenu();
    }

    public hideShareMenu(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        swan.hideShareMenu();
    }

    public shareAppMessage(shareInfo: ShareInfo): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let info = {
            title: shareInfo.title,
            imageUrl: shareInfo.imageUrl,
            query: shareInfo.query,
            success: shareInfo.success,
            fail: shareInfo.fail,
            complete: shareInfo.complete
        };
        if (swan.aldShareAppMessage) {
            swan.aldShareAppMessage(info);
        }
        else {
            swan.shareAppMessage(info);
        }
    }

    public onShareAppMessage(cb: () => ShareInfo): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let rcb = () => {
            let info = cb();
            return {
                title: info.title,
                imageUrl: info.imageUrl,
                query: info.query,
                success: info.success,
                fail: info.fail,
                complete: info.complete
            };
        };
        swan.onShareAppMessage(rcb);
    }

    public offShareAppMessage(cb: () => ShareInfo): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        swan.offShareAppMessage(cb && (cb as any).rcb);
    }

    public getLaunchOptionsSync(): LaunchOptions {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let bdOptions = swan.getLaunchOptionsSync();
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
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new BannerAdBaidu(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdBaidu(sdkConfig, cfg);
    }

    public exit() {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        swan.exit();
    }

    public setKeepScreenOn(on: boolean): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        swan.setKeepScreenOn({keepScreenOn: on});
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let info = swan.getSystemInfoSync();
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
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        cc.game.on(cc.game.EVENT_SHOW, () => {
            if (cb != null) {
                cb(showOptions);
            }
        });
    }
}

class BannerAdBaidu extends BannerAd{
    // 需要展示的位置与宽高
    private movetoBox: {left: number; top: number; width: number; height: number} = null;
    private scaleToPlat = 1;
    private realSize = {width: 0, height: 0};   // 平台单位

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let screenSize = cc.view.getVisibleSize();
        let cfgStyle = config.style || {left: 0, bottom: 0, width: screenSize.width, height: screenSize.width / 2.917};
        this.movetoBox = {left: cfgStyle.left, top: screenSize.height - cfgStyle.bottom - cfgStyle.height, width: cfgStyle.width, height: cfgStyle.height};
        let sysInfo = swan.getSystemInfoSync();
        this.scaleToPlat = sysInfo.screenWidth / screenSize.width;
        this.realSize.width = this.movetoBox.width * this.scaleToPlat;
        this.realSize.height = this.movetoBox.height * this.scaleToPlat;
    }

    public supportAutoRefresh() {
        return true;
    }

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let inst = XFireApp.getInstance();
        let sdkCfg = inst.getSdkConfig();
        if (sdkCfg.params == null || sdkCfg.params.appsid == null || sdkCfg.params.appsid === '') {
            console.error('未指定appsid');
            return;
        }
        let sysInfo = swan.getSystemInfoSync();
        let genBannerAdStyle = (style: {left?: number; bottom?: number; width?: number; height?: number}): any => {
            let realHeight = style.width / BaiduBannerRatio;
            if (realHeight > style.height) {
                style.width = style.width * (style.height / realHeight);
                style.left = (cc.view.getVisibleSize().width - style.width) / 2;
            }
            let left = style.left;
            let top = cc.view.getVisibleSize().height - style.height - style.bottom;
            return {left: left * this.scaleToPlat, top: top * this.scaleToPlat, width: style.width * this.scaleToPlat, height: style.height * this.scaleToPlat};
        };

        let style = genBannerAdStyle(this.config.style);
        this.realSize.width = style.width;
        this.realSize.height = style.height;
        let param = {adUnitId: this.config.id, style, appSid: sdkCfg.params.appsid};
        let banner = swan.createBannerAd(param);
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
            banner.onError((res: any) => {
                console.log('banner广告加载失败：' + this.config.name + ' 错误：' + JSON.stringify(res));
                this.enable = false;
            });
            banner.onResize((res: any) => {
                console.log('banner onResize：' + this.config.name + ' size：' + JSON.stringify(res));
                this.realSize.width = res.width;
                this.realSize.height = res.height;
                let dstHeight = this.movetoBox.height;
                let gheight = res.height / this.scaleToPlat;
                // 广告实际高度过高 调整宽度 使高度自动调整到预期
                if (gheight > dstHeight) {
                    banner.style.width = this.realSize.width = res.width * dstHeight / gheight;
                    // 百度对banner.style中的宽高重设不会约束比例，故重新调整
                    banner.style.height = this.realSize.height = this.realSize.width / BaiduBannerRatio;
                    banner.style.left = (cc.view.getVisibleSize().width * this.scaleToPlat - this.realSize.width) / 2;
                }
                // 广告实际高度偏小 如果alignToBottom则往下移动点
                else if (gheight < dstHeight) {
                    let dstTop = (this.movetoBox.top + this.movetoBox.height) * this.scaleToPlat - this.realSize.height;
                    banner.style.top = dstTop;
                    banner.style.left = (cc.view.getVisibleSize().width * this.scaleToPlat - this.realSize.width) / 2;
                }
            });
        }
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
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
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
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        // 百度直接设置style属性不约束宽高比，故与微信、qq有区别
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
            if (dstWidth / dstHeight > BaiduBannerRatio) {
                dstWidth = dstHeight * BaiduBannerRatio;
            }
            else {
                dstHeight = dstWidth / BaiduBannerRatio;
            }

            let style = this.platObj.style;
            style.top = dstTop;
            if (sizeChanged) {
                style.width = this.realSize.width = dstWidth;
                style.height = this.realSize.height = dstHeight;
            }
            style.left = dstLeft + (width * this.scaleToPlat - this.realSize.width) / 2;
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

class VideoAdBaidu extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let inst = XFireApp.getInstance();
        let sdkCfg = inst.getSdkConfig();
        if (sdkCfg.params == null || sdkCfg.params.appsid == null || sdkCfg.params.appsid === '') {
            console.error('未指定appsid');
            return;
        }
        let param = {adUnitId: this.config.id, appSid: sdkCfg.params.appsid};
        let video = swan.createRewardedVideoAd(param);
        this.platObj = video;
        if (video == null) {
            console.log('创建video失败');
        }
        else {
            console.log('创建video成功');
            video.onLoad(() => {
                console.log('视频广告加载成功：' + this.config.name);
                this.enable = true;
            });
            video.onError((res: any) => {
                console.log('视频广告加载失败：' + this.config.name + ' 错误:' + JSON.stringify(res));
                this.enable = false;
            });
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
