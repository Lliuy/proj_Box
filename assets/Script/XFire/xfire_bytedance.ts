/**
 * 字节跳动小程序
 * 文档：https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/introduction/
 * 连麦文档：https://bytedance.feishu.cn/docs/doccnOYdTK05iwChCGEhC3LRh0c
 * 平台特性：
 *      1.账号非必有，登录有弹窗，必须支持游客登录
 *      2.包大小限制20M，主包不超4M，分包不限制大小（需开发工具1.0.8及以上）
 *      3.有录频功能，最长录5分钟，分享只有30秒，分享长度建议11-30秒
 *      4.当前banner假定banner宽高比总是392:136
 *
 * 平台数据分析：
 *      ✦加载时长：4、5秒是正常的
 *      ✦重启率：用户主动在右上角菜单里使用重启功能，或者系统判断卡住时会出现，正常应该接近0（0.02%以下），2%就算挺高了
 *      ✦CocosCreator2.4.10创建的hello项目，在抖音安卓上显示内存占用196MB，IOS抖音上显示内存占用：470MB
 *
 * 发布方法：
 *      1.发布为字节跳动工程
 */

import SimpleUI from '../XModule/SimpleUI';
import { SNode } from '../XModule/SimpleUI/SUIData';
import SUIResLoader from '../XModule/SimpleUI/SUIResLoader';
import XFireApp, { AdCfg, BannerAd, InterstitialAd, LaunchOptions, LoginError, LoginResult, OrderInfo, SdkCfg, ShareInfo, SystemInfo, VideoAd, XFeedbackButton, XMoreGamesButton, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const ORDER_MARK = '_bytemini_order_consumed_mark_';

const byteapi: any = (window as any).tt;
let win: any = window;
let showOptions: LaunchOptions = null;

export default class XFireAppByteDance extends XFireApp{
    public static resLoader: SUIResLoader = null;
    public static bindButtonClickListener(nodeOrBtn: cc.Node | cc.Button, listener: (event: cc.Event) => void) {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
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

    private static validateNativeUserInfoResult(res: any): XUserInfoWithSignature {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (!res || !res.userInfo) {
            return null;
        }
        let userInfo = res.userInfo;
        let nickname = userInfo.nickName;
        let avatar = userInfo.avatarUrl;
        let gender = '';
        switch (userInfo.gender) {
            case 1: gender = '男'; break;
            case 2: gender = '女'; break;
        }
        let signature: any = {};
        signature.rawData = res.rawData;
        signature.signature = res.signature;
        signature.encryptedData = res.encryptedData;
        signature.iv = res.iv;
        signature.watermark = res.watermark;    // watermark.appid watermark.timestamp
        return new XUserInfoWithSignature(nickname, avatar, gender, signature);
    }

    private recorder = null;
    private recording = false;
    private recordStartTime = 0;
    private recordEnding = false;
    private toStartRecord = false;
    private toStartRecordDuration = 0;
    private toStartRecordCb: (videoPath: string, length?: number) => void = null;
    private recordCbA: (videoPath: string, length?: number) => void = null;     // startRecord传递的回调
    private recordCbB: (videoPath: string, length?: number) => void = null;     // endRecord传递的回调，优先级高于recordCbA
    private isIOS = false;
    /** 基础库版本 */
    private sdkVersion = '1.0.0';
    /** 宿主应用 */
    private appName:
        'Toutiao' |
        'Douyin' |
        'news_article_lite' |
        'live_stream' |
        'XiGua' |
        'PPX' |
        'douyin_lite' |
        'live_stream_lite' |
        'novel_fm' |
        'novelapp' |
        'reading' = 'Douyin';
    /** 宿主应用版本 */
    private appVersion = '1.0.0';

    public constructor() {
        super();
        this.plat = this.PLAT_BYTEDANCE;
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (byteapi == null || typeof byteapi.getSystemInfo !== 'function') {
            console.error('XFireAppByteDance只可在字节跳动小游戏环境下使用');
        }
        let info = byteapi?.getSystemInfoSync();
        this.isIOS = info?.platform === 'ios';
        this.sdkVersion = info?.SDKVersion || '1.0.0';
        this.appName = info?.appName || 'Douyin';
        this.appVersion = info?.version || '1.0.0';
        this.initRecorder();
        this.startPayMonitor();

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
        XFireAppByteDance.resLoader = new ResLoader();
    }

    public getSubPlat(): string {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) return;
        return byteapi.getSystemInfoSync().platform;
    }

    public getChannel(): string {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) return;
        return byteapi.getSystemInfoSync().appName;
    }

    public getAdSdkName(): string {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return '字节跳动小程序';
    }

    public supportVibrate(): boolean {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return true;
    }

    public vibrateShort() {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.vibrateShort();
    }

    public vibrateLong() {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.vibrateLong();
    }

    public supportLogin(): boolean {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return true;
    }

    /**
     * 目前头条已经下架小游戏对navigateToMiniProgram的支持
     * 需要改用createMoreGamesButton创建平台按钮，但相当麻烦
     */
    public supportMiniProgramNavigate(): boolean {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
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
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        byteapi.navigateToMiniProgram({
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

    /**
     * 显示更多游戏按钮，需要在game.json中配置【ttNavigateToMiniGameAppIdList】
     * @param spaceNode 锚定结点，为null将铆钉屏幕左上角
     * @param imageInResources 图片，如'resources/othergame.png'
     */
    public showMoreGamesButton(spaceNode: cc.Node, left: number, top: number, width: number, height: number, imageInResources: string): XMoreGamesButton {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (this.getSdkConfig().navigateApps == null) {
            console.error('跳转列表空');
            return;
        }
        if (byteapi.createMoreGamesButton == null) {
            return;
        }
        class XMoreGamesButtonByteDance extends XMoreGamesButton {
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

            protected nativeOffTap(cb: () => void): void {
                if (!this.platObj) {
                    return;
                }
                this.platObj.offTap(cb);
            }

        }
        let rect = this.rectFromNodeToPlat(spaceNode, left, top, width, height);
        let appLaunchOptions = [];
        for (let navigateApp of this.getSdkConfig().navigateApps) {
            if (navigateApp.enable !== true) {
                continue;
            }
            appLaunchOptions.push({appId: navigateApp.appId});
        }
        let btn = byteapi.createMoreGamesButton({
            type: 'image',
            image: cc.url.raw(imageInResources),
            style: {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                lineHeight: 40,
                backgroundColor: '#00000000',
                textColor: '#ffffff00',
                textAlign: 'center',
                fontSize: 16,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: '#00000000'
            },
            appLaunchOptions,
            onNavigateToMiniGame: (res) => {
                console.log('跳转其他小游戏', res);
            }
        });
        return new XMoreGamesButtonByteDance(btn);
    }

    public getSetting(params: {
        success?: (authSetting: {[key: string]: boolean}) => void;
        fail?: (err) => void;
        complete?: () => void;
    }): Promise<{
        authSetting?: {[key: string]: boolean};
        error?: string;
    }> {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new Promise<{
            authSetting?: {[key: string]: boolean};
            error?: string;
        }>((resolve) => {
            let lParams = params || {};
            byteapi.getSetting({
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
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new Promise<{
            userInfo?: XUserInfoWithSignature;
            error?: string;
        }> ((resolve) => {
            let lParams = params || {};
            byteapi.getUserInfo({
                withCredentials: true,
                success: (res: any) => {
                    let userInfo = XFireAppByteDance.validateNativeUserInfoResult(res);
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

    public supportBannerAd(): boolean {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return byteapi.createBannerAd != null;
    }

    public supportBannerAdMove(): boolean {
        return this.supportBannerAd();
    }

    public supportVideoAd(): boolean {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return byteapi.createRewardedVideoAd != null;
    }

    public supportInterstitialAd(): boolean {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return byteapi.createInterstitialAd != null;
    }

    public supportShortcut(): boolean {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let appName = byteapi.getSystemInfoSync()?.appName;
        if (appName !== 'Douyin' && appName !== 'douyin_lite') {
            return false;
        }
        return byteapi && typeof byteapi.checkShortcut === 'function' && typeof byteapi.addShortcut === 'function';
    }

    public installShortcut(): Promise<boolean> {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new Promise<boolean>((resolve) => {
            if (xfire.plat !== xfire.PLAT_BYTEDANCE || typeof byteapi.addShortcut !== 'function') {
                resolve(false);
                return;
            }
            byteapi.addShortcut({
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
            if (xfire.plat !== xfire.PLAT_BYTEDANCE || typeof byteapi.checkShortcut !== 'function') {
                resolve(false);
                return;
            }
            byteapi.checkShortcut({
                success: (res: {status: {exist: boolean; needUpdate: boolean}; errMsg: string}) => {
                    resolve(res?.status?.exist && !res?.status?.needUpdate);
                },
                fail: (err: {errMsg: string}) => {
                    resolve(false);
                }
            });
        });
    }

    public supportPayment(): boolean {
        // 当前（2022年10月11日）ios下只支持部分版本计费
        if (this.isIOS) {
            return this.compareVersion(this.sdkVersion, '2.64.0') >= 0 &&
                this.appName === 'Douyin' &&
                this.compareVersion(this.appVersion, '22.3.0') >= 0 &&
                typeof byteapi.openAwemeCustomerService === 'function';
        }
        else {
            return this.compareVersion(this.sdkVersion, '1.5.3') >= 0;
        }
    }

    public supportClipboard() {
        return true;
    }

    public setClipboardData(content: string): Promise<boolean> {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new Promise<boolean> ((resolve) => {
            byteapi.setClipboardData({
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
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new Promise<string> ((resolve) => {
            byteapi.getClipboardData({
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
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.login({
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
            fail: (res) => {
                if (param.fail) {
                    param.fail({msg: JSON.stringify(res)});
                }
            },
            complete: () => {
                if (param.complete) {
                    param.complete();
                }
            }
        });
    }

    public supportRecord(): boolean {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return true;
    }

    public startRecord(duration: number, onEnd: (videoPath: string, length: number) => void) {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (!this.recorder) {
            console.error('recorder未初始化');
            return;
        }
        if (this.recording) {
            console.error('正在录屏中');
            return;
        }

        if (this.recordEnding) {
            this.toStartRecord = true;
            this.toStartRecordDuration = duration;
            this.toStartRecordCb = onEnd;
            this.recording = true;
            return;
        }

        this.recordCbA = onEnd;
        this.recordCbB = null;

        this.recording = true;
        this.recordStartTime = xfire.gameTime;
        this.recorder.onError((err: string) => {
            console.error('录屏错误：' + JSON.stringify(err));
        });
        this.recorder.onStop((res: any) => {
            setTimeout(() => {
                let time = xfire.gameTime - this.recordStartTime;
                this.recordEnding = false;
                if (this.recordCbB) {
                    this.recordCbB(res.videoPath, time);
                }
                else if (this.recordCbA) {
                    this.recordCbA(res.videoPath, time);
                }
                // recording标记修改放在回调后，防止回调内再启动录屏
                if (!this.toStartRecord) {
                    this.recording = false;
                    return;
                }
                this.recordCbA = this.toStartRecordCb;
                this.recorder.start({duration: Math.max(this.toStartRecordDuration, 3)});
                this.recordStartTime = xfire.gameTime;
                this.toStartRecord = false;
                this.toStartRecordCb = null;
            }, 0);
        });
        this.recorder.start({duration: Math.max(duration, 3)});
    }

    public endRecord(onEnd?: (videoPath: string, length: number) => void) {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (!this.recording) {
            console.error('未在录屏中');
            return;
        }
        if (this.toStartRecord) {
            this.recording = false;
            this.toStartRecord = false;
            let toStartRecordCb = this.toStartRecordCb;
            this.toStartRecordCb = null;
            setTimeout(() => {
                if (onEnd) {
                    onEnd(null, 0);
                }
                else if (toStartRecordCb) {
                    toStartRecordCb(null, 0);
                }
            }, 0);
            return;
        }
        this.recordCbB = onEnd;
        this.recording = false;
        this.recordEnding = true;
        if (this.recorder) {
            this.recorder.stop();
        }
    }

    public isRecording() {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return this.recording;
    }

    public shareVideo(params: string | {
        title?: string;
        desc?: string;
        /** 话题 */
        topics?: string | string[];
        videoPath?: string;
        success?: () => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }) {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let lParams: any = {};
        if (typeof params === 'string') {
            lParams.videoPath = params as string;
        }
        else {
            lParams = params;
        }
        let topics: string[] = [];
        if (lParams.topics != null) {
            if (typeof lParams.topics === 'string') {
                topics.push(lParams.topics);
            }
            else if (Array.isArray(lParams.topics)) {
                topics = topics.concat(lParams.topics);
            }
        }
        byteapi.shareAppMessage({
            channel: 'video',
            desc: lParams.desc || '',
            title: lParams.title || '',
            imageUrl: '',
            query: '',
            extra: {
                hashtag_list: topics,
                videoTopics: topics,
                videoPath: lParams.videoPath || ''
            },
            success() {
                if (lParams.success) {
                    lParams.success();
                }
            },
            fail(e) {
                if (lParams.fail) {
                    lParams.fail(JSON.stringify(e));
                }
            },
            complete() {
                if (lParams.complete) {
                    lParams.complete();
                }
            }
        });
    }

    public supportShare(): boolean {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return true;
    }

    public showShareMenu(): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.showShareMenu();
    }

    public hideShareMenu(): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.hideShareMenu();
    }

    public shareAppMessage(shareInfo: ShareInfo): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        if (byteapi.aldShareAppMessage) {
            byteapi.aldShareAppMessage(info);
        }
        else {
            byteapi.shareAppMessage(info);
        }
    }

    public getSharer(): string {
        let options = byteapi.getLaunchOptionsSync();
        let xhsid = options?.query?.xhsid;
        if (xhsid) {
            this.sharer = xhsid;
        }
        return this.sharer;
    }

    public onShareAppMessage(cb: () => ShareInfo): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        byteapi.onShareAppMessage(rcb);
    }

    public offShareAppMessage(cb: () => ShareInfo): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.offShareAppMessage(cb && (cb as any).rcb);
    }

    public getLaunchOptionsSync(): LaunchOptions {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let bdOptions = byteapi.getLaunchOptionsSync();
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
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new BannerAdByteDance(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new VideoAdByteDance(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new InterstitialAdByteDance(sdkConfig, cfg);
    }

    public exit() {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.exitMiniProgram();
    }

    public setKeepScreenOn(on: boolean): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.setKeepScreenOn({keepScreenOn: on});
    }

    public getSystemInfoSync(): SystemInfo {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let info = byteapi.getSystemInfoSync();
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
        byteapi.triggerGC?.();
    }

    /**
     * 抖音平台下弹出抖音号关注面板，前提是后台已经给游戏绑定 抖音号
     */
    public openAwemeUserProfile() {
        if (byteapi.openAwemeUserProfile) {
            byteapi.openAwemeUserProfile();
        }
    }


    /** 判断平台是否支持创建意见反馈按钮 */
    public supportFeedbackButton (): boolean {
        return true;
    }

    // 创建客服按钮
    public createFeedbackButton (spaceNode: cc.Node, left: number, top: number, width: number, height: number, imagePath: string = null): XFeedbackButton {
        if (!(cc.sys.platform === cc.sys.BYTEDANCE_GAME) || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return null;
        }
        let rect = this.rectFromNodeToPlat(spaceNode, left, top, width, height);
        let btn = null;
        class XFeedbackButtonByteDance extends XFeedbackButton {
            public constructor (platObj) {
                super(platObj);
            }

            public show (): void {
                if (this.platObj) {
                    this.platObj.show();
                }
            }

            public hide (): void {
                if (this.platObj) {
                    this.platObj.hide();
                }
            }

            public destroy (): void {
                if (this.platObj) {
                    this.platObj.destroy();
                }
            }

            protected nativeOnTap (cb: () => void): void {
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

            protected nativeOffTap (cb: any): void {
                if (!this.platObj) {
                    return;
                }
                this.platObj.offTap(cb);
            }
        }
        if (imagePath != null) {
            btn = byteapi.createContactButton({ type: 'image', image: imagePath, style: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } });
        }
        else {
            btn = byteapi.createContactButton({ type: 'text', text: ' ', style: { left: rect.left, top: rect.top, width: rect.width, height: rect.height, backgroundColor: '#00000000', borderColor: '#00000000' } });
        }

        return new XFeedbackButtonByteDance(btn);
    }

    public checkPayment() {
        this.startPayMonitor();
    }

    protected async nativePay(payPoint: string, orderid: string) {
        if (!(cc.sys.platform === cc.sys.BYTEDANCE_GAME) || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        // 登录检查
        let logined = await this.checkSession();
        if (!logined) {
            console.error('未登录不能计费');
            return;
        }

        let payPointCfg = this.getPayPointConfig(payPoint);
        let orderInfo: OrderInfo = {payPoint, orderid, goodsName: payPointCfg.goods, goodsId: payPointCfg.id, count: payPointCfg.count == null ? 1 : payPointCfg.count, price: payPointCfg.price};
        // 先预下单
        let result = await this.httpGetJsonWithBody<{
            result: 'ok' | 'fail';
            msg: string;
            data: {prepayId: string; orderid: string};
        }>('https://minigame.orbn.top/minigame/pay/bytedancemini/prepay', {
            id: this.userid,
            session: this.userSession,
            goodsId: payPointCfg.id,
            goodsName: payPointCfg.goods,
            count: payPointCfg.count,
            price: payPointCfg.price
        });
        // 再加一次判断，因为异步问题导致代码压缩光头部的返回不符合预期
        if (!(cc.sys.platform === cc.sys.BYTEDANCE_GAME) || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (result.error || result.json == null || result.json.result !== 'ok') {
            console.log(result);
            return;
        }
        orderInfo.orderid = result.json.data.orderid;
        // 启动支付 下方注释说明仅针对requestGamePayment，openAwemeCustomerService当前为ios专用，需要特殊文档对应
        let payApi = this.isIOS ? byteapi.openAwemeCustomerService : byteapi.requestGamePayment;

        let doPay = () => {
            payApi({
                mode: this.isIOS ? undefined : 'game',           // string, 支付类型，目前(2022年10月8日)仅为'game'
                env: this.isIOS ? undefined : 0,                 // number, 环境配置，目前(2022年10月8日)仅为0
                currencyType: 'CNY',                             // string, 币种，目前（2022年10月8日）仅为'CNY'
                platform: this.isIOS ? undefined : 'android',    // string, 申请接入时的平台，目前（2022年10月8日）仅为'android'
                buyQuantity: Math.floor(payPointCfg.price * 100),   // 100为人民币与平台中间币兑换比例，玩家不会接触到平台中间币
                zoneId: '1',            // string，可选参数，游戏服务区 id，开发者自定义。游戏不分大区则默认填写"1"。
                customId: result.json.data.orderid,     // 游戏开发者自定义的唯一订单号，订单支付成功后通过服务端支付结果回调回传
                extraInfo: '',          // 游戏开发者自定义的其他信息，订单支付成功后通过服务端支付结果回调回传。字符串长度最大不能超过 256。
                success: (res) => {
                    console.log('pay succ:' + xfire.currentTimeMillis);
                    if (this.isIOS) {
                        // IOS下只能通过服务器订单状态来判断
                        (async () => {
                            do {
                                await xfire.sleep(0.2);
                            } while (cc.director.isPaused());
                            let orderstatus: '成功' | '失败' | '已消费' | '未知' = '未知';
                            do {
                                orderstatus = await this.checkOrder(orderInfo.orderid);
                                if (orderstatus === '未知') {
                                    await xfire.sleep(3);
                                }
                                else if (orderstatus === '成功') {
                                    this.consumeGoods(orderInfo.orderid);
                                }
                            } while (orderstatus === '未知');
                        })();
                    }
                    else {
                        this.consumeGoods(orderInfo.orderid, orderInfo);
                    }
                },
                // tslint:disable-next-line: cyclomatic-complexity
                fail: (res: {errCode: number}) => {
                    console.log('pay fail:' + xfire.currentTimeMillis);
                    let err = '';
                    let cancel = false;
                    let doCancelOrder = () => {
                        this.httpGetJsonWithBody('https://minigame.orbn.top/minigame/pay/bytedancemini/cancel', {
                                    id: this.userid,
                                    session: this.userSession,
                                    orderid: result.json.data.orderid
                                });
                    };
                    if (res) {
                        switch (res.errCode) {
                            case -1: err = '支付失败'; break;
                            case -2:
                                err = '用户取消支付';
                                cancel = true;
                                doCancelOrder();
                                break;
                            case -15001: err = '缺少参数'; break;
                            case -15002: err = '请求参数不合法'; break;
                            case -15003: err = 'app不支持小游戏支付'; break;
                            case -15006: err = 'app没有支付权限'; break;
                            case -15009: err = '内部错误，支付失败'; break;
                            case -15098: err = '当前用户未通过实名认证'; break;
                            case -15099: err = '当前用户累计支付金额超过限制'; break;
                            case -16000: err = '用户未登录'; break;
                            case 2: err = '正在支付一起订单时，又发起了一笔支付请求'; break;
                            case 3: err = '调起收银台失败'; break;
                            case 4: err = '网络异常'; break;
                            case 5: err = 'IOS 平台错误，当前平台不支持支付'; break;
                            case 6: err = '其他错误'; break;
                            default:    err = `错误码${res.errCode}`;   break;
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
        };

        // ios 抖音23.0.0以下计费接口被限制在触摸回调中执行
        if (this.isIOS && this.compareVersion(this.appVersion, '23.0.0') < 0) {
            await this.showNativeModal({title: '购买确认', content: payPointCfg.desc, cb: (confirm) => {
                if (confirm) {
                    doPay();
                }
            }});
        }
        else {
            doPay();
        }
    }

    protected nativeOnShow(cb: (options?: LaunchOptions) => void): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        cc.game.on(cc.game.EVENT_SHOW, () => {
            if (cb != null) {
                cb(showOptions);
            }
        });
    }

    /** 登录检验 */
    private checkSession(): Promise<boolean> {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new Promise<boolean> ((resolve) => {
            byteapi.checkSession({
                success() {
                    resolve(true);
                },
                fail() {
                    resolve(false);
                }
            });
        });
    }

    /** 使用自渲染模态框等待用户确认 */
    private showNativeModal(params: {title: string; content: string; cb?: (confirm: boolean) => void}): Promise<boolean> {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new Promise<boolean> ((resolve) => {
            let layerAd = xfire.getLayerNativeAd();
            if (layerAd == null) {
                console.log('异常，不存在原生层');
                return null;
            }
            let iData: SNode = {'name': '结点_对话框', 'size': [720, 1280], 'components': [{'name': 'Widget', 'properties': {'left': 0, 'top': 0, 'right': 0, 'bottom': 0, 'alignMode': null}}, {'name': 'BlockInput'}], 'children': [{'name': '黑底', 'active': false, 'color': '000000', 'opacity': 128, 'size': [720, 1280], 'components': [{'name': 'Sprite', 'properties': {'image': 'bg1x1', 'type': 0, 'sizeMode': 0}}, {'name': 'Widget', 'properties': {'left': 0, 'top': 0, 'right': 0, 'bottom': 0, 'alignMode': null}}]}, {'name': 'root', 'size': [600, 400], 'components': [{'name': 'BlockInput'}], 'children': [{'name': 'bg', 'size': [600, 400], 'components': [{'name': 'Sprite', 'properties': {'image': 'bg1x1', 'type': 0, 'sizeMode': 0}}]}, {'name': '割线x', 'color': 'c8c8c8', 'pos': [0, -110], 'size': [600, 4], 'components': [{'name': 'Sprite', 'properties': {'image': 'bg1x1', 'type': 0, 'sizeMode': 0}}]}, {'name': '割线y', 'color': 'c8c8c8', 'pos': [0, -110], 'anchor': [0.5, 1], 'size': [4, 90], 'components': [{'name': 'Sprite', 'properties': {'image': 'bg1x1', 'type': 0, 'sizeMode': 0}}]}, {'name': '标题', 'color': '000000', 'pos': [0, 160], 'size': [500, 70], 'components': [{'name': 'Label', 'properties': {'string': '标题', 'hAlign': 1, 'vAlign': 1, 'fontSize': 40, 'lineHeight': 40, 'overflow': 2, 'cacheMode': 0}}, {'name': 'Widget', 'properties': {'top': 5, 'alignMode': null}}]}, {'name': '描述', 'color': '5f5f5f', 'pos': [0, 110.383], 'anchor': [0.5, 1], 'size': [500, 200], 'components': [{'name': 'Label', 'properties': {'string': '免除', 'hAlign': 1, 'vAlign': 0, 'fontSize': 45, 'lineHeight': 50, 'overflow': 2, 'cacheMode': 0}}]}, {'name': '按钮取消', 'pos': [-150, -155], 'size': [300, 90], 'components': [{'name': 'Button', 'properties': {'transition': 3, 'zoomScale': 1.2, 'normalSprite': 'default_btn_normal'}}, {'name': 'Widget', 'properties': {'right': 300, 'bottom': 0, 'alignMode': null}}], 'children': [{'name': 'Label', 'color': '000000', 'size': [80, 50.4], 'components': [{'name': 'Label', 'properties': {'string': '取消', 'hAlign': 1, 'vAlign': 1, 'fontSize': 40, 'lineHeight': 40, 'overflow': 0, 'cacheMode': 0}}]}]}, {'name': '按钮确定', 'pos': [150, -155], 'size': [300, 90], 'components': [{'name': 'Button', 'properties': {'transition': 3, 'zoomScale': 1.2, 'normalSprite': 'default_btn_normal'}}, {'name': 'Widget', 'properties': {'right': 0, 'bottom': 0, 'alignMode': null}}], 'children': [{'name': 'Label', 'color': 'cd6661', 'size': [80, 50.4], 'components': [{'name': 'Label', 'properties': {'string': '确定', 'hAlign': 1, 'vAlign': 1, 'fontSize': 40, 'lineHeight': 40, 'overflow': 0, 'cacheMode': 0}}]}]}]}]};
            let node = SimpleUI.instantiate(iData, XFireAppByteDance.resLoader);
            // 取出一些关键点
            let root = node.getChildByName('root');
            node.zIndex = cc.macro.MAX_ZINDEX;
            node.parent = layerAd;
            // 标题
            let nodeTitle = cc.find('标题', root);
            if (nodeTitle) {
                let cmp = nodeTitle.getComponent(cc.Label);
                if (cmp) {
                    cmp.string = params.title;
                }
            }
            // 文本框
            let nodeContent = cc.find('描述', root);
            if (nodeContent) {
                let cmp = nodeContent.getComponent(cc.Label);
                if (cmp) {
                    cmp.string = params.content;
                }
            }
            // 按钮确定
            XFireAppByteDance.bindButtonClickListener(cc.find('按钮确定', root), () => {
                node.destroy();
                resolve(true);
                if (params.cb) {
                    params.cb(true);
                }
            });
            // 按钮取消
            XFireAppByteDance.bindButtonClickListener(cc.find('按钮取消', root), () => {
                node.destroy();
                resolve(false);
                if (params.cb) {
                    params.cb(false);
                }
            });
        });
    }

    /** 使用模态框等待用户确认 */
    private showPlatModal(params: {title: string; content: string}): Promise<boolean> {
        return new Promise<boolean> ((resolve) => {
            byteapi.showModal({
                title: params.title,
                content: params.content,
                success(res: any) {
                    let result = false;
                    if (res.confirm) {
                        result = true;
                    }
                    resolve(result);
                },
                fail(res: any) {
                    console.error('showModal调用失败');
                    resolve(false);
                }
            });
        });
    }

    /**
     * 启动支付监视器，处理未消耗物品
     */
    private startPayMonitor() {
        if (!(cc.sys.platform === cc.sys.BYTEDANCE_GAME) || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let goodsListFetched = false;
        (async () => {
            while (true) {
                if (this.userid == null || this.userid === '' || this.userSession == null || this.userSession === '' || this.payNotifier == null) {
                    await this.sleep(3);
                    continue;
                }
                if (goodsListFetched) {
                    break;
                }
                let ret = await this.httpGetJsonWithBody<{
                    result: 'ok' | 'fail';
                    msg: string;
                    data: {goodsList: {goods: string; count: number; orderid: string}[]};
                }>('https://minigame.orbn.top/minigame/pay/bytedancemini/getMyGoods', {
                    id: this.userid,
                    session: this.userSession
                });
                if (ret != null && ret.error == null && ret.json.result === 'ok') {
                    console.log('物品表:' + JSON.stringify(ret));
                    goodsListFetched = true;
                    for (let goods of ret.json.data.goodsList) {
                        this.consumeGoods(goods.orderid);
                        await this.sleep(1);
                    }
                }
                await this.sleep(3);
            }
        })();
    }

    private async consumeGoods(orderid: string, orderInfo?: OrderInfo) {
        if (!(cc.sys.platform === cc.sys.BYTEDANCE_GAME) || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (!this.payNotifier || !this.payNotifier.success) {
            return;
        }
        let consumed = this.isOrderConsumed(orderid);
        // 如果有订单信息则先发放好了，减少意外
        if (orderInfo && !consumed) {
            this.payNotifier.success(orderInfo);
            this.markOrderConsumed(orderid);
        }
        // 抹去服务器记录
        let ret = await this.httpGetJsonWithBody<{
            result: 'ok' | 'fail';
            msg: string;
            data: OrderInfo;
        }>('https://minigame.orbn.top/minigame/pay/bytedancemini/consumeGoods', {
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

    private checkOrder(orderid: string): Promise<'成功' | '失败' | '已消费' | '未知'> {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) return;
        return new Promise<'成功' | '失败' | '已消费' | '未知'> (async (resolve) => {
            // 去服务器查询订单状态
            let ret = await this.httpGetJsonWithBody<{
                result: 'ok' | 'fail';
                msg: string;
                data: {
                    orderid: string;
                    goodsName: string;
                    count: number;
                    price: number;
                    status: '已消费' | '成功' | '取消' | '失败' | '超时' | '确认中';
                };
            }>('https://minigame.orbn.top/minigame/pay/bytedancemini/checkOrder', {
                id: this.userid,
                session: this.userSession,
                orderid
            });
            if (ret == null || ret.error != null || ret.json.result !== 'ok' || ret.json.data == null) {
                resolve('未知');
                return;
            }
            switch (ret.json.data.status) {
                case '已消费':
                    resolve('已消费');
                    return;
                case '取消':
                case '失败':
                case '超时':
                    resolve('失败');
                    return;
                case '成功':
                    resolve('成功');
                    return;
                default:
                    resolve('未知');
                    return;
            }
        });
    }

    private markOrderConsumed(orderid: string): void {
        if (!(cc.sys.platform === cc.sys.BYTEDANCE_GAME) || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let key = ORDER_MARK + orderid;
        cc.sys.localStorage.setItem(key, 'true');
    }

    private isOrderConsumed(orderid: string): boolean {
        if (!(cc.sys.platform === cc.sys.BYTEDANCE_GAME) || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let key = ORDER_MARK + orderid;
        return cc.sys.localStorage.getItem(key) === 'true';
    }

    private initRecorder() {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        this.recorder = byteapi.getGameRecorderManager();
        if (this.recorder) {
            this.recorder.onError((errMsg: string) => {
                console.error('录屏出现错误：' + errMsg);
            });
        }
    }
}

class BannerAdByteDance extends BannerAd{
    // 需要展示的位置与宽高
    private movetoBox: { left: number; top: number; width: number; height: number } = null;
    private scaleToPlat = 1;
    private realSize = { width: 0, height: 0 };   // 平台单位
    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let screenSize = cc.view.getVisibleSize();
        let cfgStyle = config.style || { left: 0, bottom: 0, width: screenSize.width, height: screenSize.width / 2.917 };
        this.movetoBox = { left: cfgStyle.left, top: screenSize.height - cfgStyle.bottom - cfgStyle.height, width: cfgStyle.width, height: cfgStyle.height };
        let sysInfo = byteapi.getSystemInfoSync();
        this.scaleToPlat = sysInfo.screenWidth / screenSize.width;
        this.realSize.width = this.movetoBox.width * this.scaleToPlat;
        this.realSize.height = this.movetoBox.height * this.scaleToPlat;
    }

    public supportAutoRefresh() {
        return true;
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        // 定义style转换接口
        let genBannerAdStyle = (_style: {left?: number; top?: number; width?: number; height?: number}): any => {
            let style = xfire.copy(_style);
            if ((style.height / style.width) < (136 / 392)) {
                let newWidth = style.height / (136 / 392);
                let newLeft = style.left + (style.width - newWidth) / 2;
                style.width = newWidth;
                style.left = newLeft;
            }
            return { left: style.left * this.scaleToPlat, top: style.top * this.scaleToPlat, width: style.width * this.scaleToPlat, height: style.height * this.scaleToPlat };
        };

        let style = genBannerAdStyle(this.movetoBox);
        this.realSize.width = style.width;
        this.realSize.height = style.height;
        let adIntervals = (this.config.duration || 30);
        let param = { adUnitId: this.config.id, adIntervals: adIntervals < 30 ? 30 : adIntervals, style };
        let banner = byteapi.createBannerAd(param);
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
                console.error('banner广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
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
                    banner.style.left = (cc.view.getVisibleSize().width * this.scaleToPlat - this.realSize.width) / 2;
                }
                // 广告实际高度偏小 如果alignToBottom则往下移动点
                else if (gheight < dstHeight) {
                    let dstTop = (this.movetoBox.top + this.movetoBox.height) * this.scaleToPlat - this.realSize.height;
                    banner.style.top = dstTop;
                    banner.style.left = (cc.view.getVisibleSize().width * this.scaleToPlat - this.realSize.width) / 2;
                }
                if (this.visible) {
                    setTimeout(() => {
                        if (this.visible) {
                            this.nativeShow();
                        }
                    }, 0);
                }
                console.log('onResize ' + JSON.stringify(banner.style));
            });
        }
    }

    public get size(): { width: number; height: number } {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.show()
                .then(() => {
                    console.log('广告展示成功：' + this.config.name);
                })
                .catch((err) => {
                    console.log('广告展示出现问题：' + this.config.name, err);
                });
        }
    }

    protected nativeHide(): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.hide();
        }
    }
}

// 字节跳动的视频会自动更换源 无需反复销毁创建
class VideoAdByteDance extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let param = {adUnitId: this.config.id};
        let video = byteapi.createRewardedVideoAd(param);
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
                console.log('视频广告加载失败：' + this.config.name);
                this.enable = false;
            });
            video.load();
        }
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
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

class InterstitialAdByteDance extends InterstitialAd {
    public load(): void {
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let param = {adUnitId: this.config.id};
        let ad = byteapi.createInterstitialAd(param);
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
            ad.onClose(() => {
                if (this.enable) {
                    ad.destroy();
                    this.enable = false;
                    this.load();
                }
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
        if (xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.show()
                .then(() => {
                    console.log('插屏广告展示成功：' + this.config.name);
                }).catch((err) => {
                    if (err && err.errCode === 2001) {
                        console.log('插屏展示失败：刚启动一段时间内不允许展示，无需理会');
                    }
                    else if (err && err.errCode === 2002) {
                        console.log('插屏展示失败：展示间隔限制，无需理会');
                    }
                    else {
                        console.log('插屏广告展示失败：' + JSON.stringify(err));
                        if (this.enable) {
                            this.platObj.destroy();
                            this.enable = false;
                            this.load();
                        }
                    }
                });
        }
    }
}
