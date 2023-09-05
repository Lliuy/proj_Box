/**
 * 字节跳动小程序
 * 文档：https://developer.toutiao.com/dev/cn/mini-game/develop/api/mini-game/bytedance-mini-game
 * 头条买量api上报接入文档：https://bytedance.feishu.cn/docs/doccn3sZ4zo31NM33mXhHe?aadvid=1674898506255373
 * 平台特性：
 *      1.账号非必有，登录有弹窗，必须支持游客登录
 *      2.包大小限制8M，不支持分包
 *      3.有录频功能，最长录5分钟，分享只有30秒，分享长度建议11-30秒
 *      4.启动时可能触发实名认证而弹出登录框
 *      5.获取登录、用户信息、录屏会触发登录
 *      6.重力加速度接口返回的值被约束到了1以内，而qq、微信无此限制
 *
 * 特殊能力：
 *      1.录屏
 *      2.引导组件，接口：showFavoriteGuide
 *
 * 平台数据分析：
 *      ✦加载时长：4、5秒是正常的
 *      ✦重启率：用户主动在右上角菜单里使用重启功能，或者系统判断卡住时会出现，正常应该接近0（0.02%以下），2%就算挺高了
 *
 * 调试：
 *      使用开发工具的真机调试，可以查看日志
 *
 * 发布方法：
 *      1.发布为微信工程
 *      2.使用字节跳动开发工具打开微信工程
 */

import XFireApp, { AdCfg, BannerAd, InterstitialAd, LaunchOptions, LoginError, LoginResult, SdkCfg, ShareInfo, SystemInfo, VideoAd, XMoreGamesButton, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const CC_VERSION_20 = cc.ENGINE_VERSION.indexOf('2.0.') === 0;
const CC_VERSION_21 = cc.ENGINE_VERSION.indexOf('2.1.') === 0;

const byteapi: any = (window as any).tt;
let win: any = window;
let showOptions: LaunchOptions = null;

if (cc.sys.platform === cc.sys.WECHAT_GAME && byteapi != null && (CC_VERSION_20 || CC_VERSION_21) && (typeof XH_PLAT === 'undefined' || XH_PLAT === 'bytedance')) {
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
        if (!XFireAppByteDance.getInstance()) {
            return;
        }
        if (!XFireAppByteDance.getInstance().isVideoAdPlaying()) {
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
        if (!XFireAppByteDance.getInstance()) {
            return;
        }
        if (!XFireAppByteDance.getInstance().isVideoAdPlaying()) {
            cc.game.emit(cc.game.EVENT_HIDE);
        }
    };
}

export default class XFireAppByteDance extends XFireApp {
    private static validateNativeUserInfoResult(res: any): XUserInfoWithSignature {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
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
    /** 加速度监听函数 */
    private accCb: (res: {x: number; y: number; z: number}) => void = null;

    public constructor() {
        super();
        this.plat = this.PLAT_BYTEDANCE;
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        this.initRecorder();
        if (byteapi == null || typeof byteapi.getSystemInfo !== 'function') {
            console.error('XFireAppByteDance只可在字节跳动小游戏环境下使用');
        }
        // 头条买量数据上报
        setTimeout(() => {
            try {
                let launchOption = byteapi.getLaunchOptionsSync();
                if (launchOption.query && launchOption.query.ad_params) {
                    let adParams = launchOption.query.ad_params;
                    // adParams含cid intercept_flag log_extra web_url
                    let params = typeof adParams === 'string' ? JSON.parse(decodeURIComponent(adParams)) : adParams;
                    let callback = launchOption.query.clickid;
                    let conv_time = Math.floor(xfire.currentTimeMillis / 1000);
                    let source = 'default';
                    let event_type = 0;
                    xfire.httpGetString('https://ad.toutiao.com/track/activate/', {callback, source, event_type, conv_time});
                }
            } catch (error) {
                console.error(error);
            }
        }, 0);
    }

    public getAdSdkName(): string {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return '字节跳动小程序';
    }

    public supportVibrate(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return true;
    }

    public vibrateShort() {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.vibrateShort();
    }

    public vibrateLong() {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.vibrateLong();
    }

    public supportLogin(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return true;
    }

    public supportAutoLogin(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return false;
    }

    /**
     * 目前头条已经下架小游戏对navigateToMiniProgram的支持
     * 需要改用createMoreGamesButton创建平台按钮，但相当麻烦
     */
    public supportMiniProgramNavigate(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
            appLaunchOptions.push({ appId: navigateApp.appId });
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
        success?: (authSetting: { [key: string]: boolean }) => void;
        fail?: (err) => void;
        complete?: () => void;
    }): Promise<{
        authSetting?: { [key: string]: boolean };
        error?: string;
    }> {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
            byteapi.getUserInfo({
                withCredentials: true,
                success: (res: any) => {
                    let userInfo = XFireAppByteDance.validateNativeUserInfoResult(res);
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

    public supportBannerAd(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return byteapi.createBannerAd != null;
    }

    public supportVideoAd(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return byteapi.createRewardedVideoAd != null;
    }

    public supportInterstitialAd(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return byteapi.createInterstitialAd != null;
    }

    public supportClipboard() {
        return true;
    }

    public setClipboardData(content: string): Promise<boolean> {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new Promise<boolean>((resolve) => {
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new Promise<string>((resolve) => {
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

    public supportAccelerometer(): boolean {
        return true;
    }

    public startAccelerometer() {
        if (byteapi.startAccelerometer) {
            byteapi.stopAccelerometer();
            byteapi.startAccelerometer();
            if (this.accCb == null) {
                this.accCb = (res: {x: number; y: number; z: number}) => {
                    this.dispatchAccelerometerChange(res.x, res.y, res.z, true);
                };
                byteapi.onAccelerometerChange(this.accCb);
            }
        }
    }

    public stopAccelerometer() {
        if (byteapi.stopAccelerometer) {
            // 微信此接口不会清理微信内的加速度监听函数
            byteapi.stopAccelerometer();
        }
    }

    public login(param: {
        timeout?: number;                       // 超时时间，单位ms
        success?: (res: LoginResult) => void;
        fail?: (err: LoginError) => void;
        complete?: () => void;
    } = {}): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.login({
            success: (res: { errMsg: string; code?: string }) => {
                this.logined = true;
                cc.sys.localStorage.setItem(XFireConfigs.平台账号登录标记, 'true');
                if (res.code) {
                    if (param.success) {
                        param.success({ plat: this.plat, code: res.code });
                    }
                }
                else {
                    if (param.fail) {
                        param.fail({ msg: res.errMsg });
                    }
                }
            },
            fail: (res) => {
                if (param.fail) {
                    param.fail({ msg: JSON.stringify(res) });
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return true;
    }

    public startRecord(duration: number, onEnd: (videoPath: string, length: number) => void) {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
                this.recorder.start({ duration: Math.max(this.toStartRecordDuration, 3) });
                this.recordStartTime = xfire.gameTime;
                this.toStartRecord = false;
                this.toStartRecordCb = null;
            }, 0);
        });
        this.recorder.start({ duration: Math.max(duration, 3) });
    }

    public endRecord(onEnd?: (videoPath: string, length: number) => void) {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return this.recording;
    }

    /**
     * 在下方显示收藏引导条
     * 10s 后自动消失
     * 每位用户最多触达【2 次】，最短间隔【一周】才能第二次展现
     * 若检测到用户已收藏该小程序，则不展示任何引导组件
     * @param text 要显示的文本，如：一键添加到我的小程序
     */
    public showFavoriteGuide(text: string) {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE || byteapi.showFavoriteGuide == null) {
            return;
        }
        byteapi.showFavoriteGuide({
            type: 'bar',
            content: text,
            position: 'bottom'
        });
    }

    public shareVideo(params: string | {
        title?: string;
        videoPath?: string;
        success?: () => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }) {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let lParams: any = {};
        if (typeof params === 'string') {
            lParams.videoPath = params as string;
        }
        else {
            lParams = params;
        }
        byteapi.shareAppMessage({
            channel: 'video',
            title: lParams.title || '',
            imageUrl: '',
            query: '',
            extra: {
                videoPath: lParams.videoPath || '',
                videoTopics: []
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return true;
    }

    public showShareMenu(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.showShareMenu();
    }

    public hideShareMenu(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.hideShareMenu();
    }

    public shareAppMessage(shareInfo: ShareInfo): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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

    public onShareAppMessage(cb: () => ShareInfo): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.offShareAppMessage(cb && (cb as any).rcb);
    }

    public getLaunchOptionsSync(): LaunchOptions {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let bdOptions = byteapi.getLaunchOptionsSync();
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new BannerAdByteDance(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new VideoAdByteDance(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        return new InterstitialAdByteDance(sdkConfig, cfg);
    }

    public exit() {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.exitMiniProgram();
    }

    public setKeepScreenOn(on: boolean): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        byteapi.setKeepScreenOn({ keepScreenOn: on });
    }

    public getSystemInfoSync(): SystemInfo {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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

    protected nativeOnShow(cb: (options?: LaunchOptions) => void): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        cc.game.on(cc.game.EVENT_SHOW, () => {
            if (cb != null) {
                cb(showOptions);
            }
        });
    }

    private initRecorder() {
        this.recorder = byteapi.getGameRecorderManager();
        if (this.recorder) {
            this.recorder.onError((errMsg: string) => {
                console.error('录屏出现错误：' + errMsg);
            });
        }
    }
}

class BannerAdByteDance extends BannerAd {
    private bottom: number = null;
    private scaleToPlat = 1;
    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        let sysInfo = byteapi.getSystemInfoSync();
        this.scaleToPlat = sysInfo.screenWidth / cc.view.getVisibleSize().width;
    }

    public supportAutoRefresh() {
        return true;
    }

    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }

        let sysInfo = byteapi.getSystemInfoSync();
        let genBannerAdStyle = (style: { left?: number; bottom?: number; width?: number; height?: number }): any => {
            let ratio = cc.view.getVisibleSize().width / sysInfo.screenWidth;
            let left = style.left;
            let top = cc.view.getVisibleSize().height - style.height - this.bottom;
            return { left: left / ratio, top: top / ratio, width: style.width / ratio, height: style.height / ratio };
        };

        let style = genBannerAdStyle(this.config.style);
        let param = { adUnitId: this.config.id, style, adIntervals: 30 };
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
            banner.onResize((size: any) => {
                if (size.width === 0 && size.height === 0) {
                    console.log('banner onResize 宽高均为0');
                    return;
                }
                // 当前存在多次onResize，多次失败的问题，可能平台限制了宽度 先保留 [2019年10月9日 老张]
                let height = (size.height == null || size.height === 0) ? size.width * 9 / 16 : size.height;
                const {
                    windowWidth,
                    windowHeight
                } = byteapi.getSystemInfoSync();
                banner.style.top = windowHeight - size.height;
                banner.style.left = (windowWidth - size.width) / 2;
                console.log('onResize banner.style', JSON.stringify(banner.style));
            });
        }
    }

    public destroy(): void {
    }

    protected nativeShow(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.hide();
            // 当前自动重建不够完善
            /*
            this.platObj.destroy();
            this.platObj = null;
            this.enable = false;
            // 目前destroy存在时间，不能立即load
            setTimeout(() => {
                this.load();
            }, 60);*/
        }
    }
}

// 字节跳动的视频会自动更换源 无需反复销毁创建
class VideoAdByteDance extends VideoAd {
    private playCb: (end: boolean) => void = null;
    private dontPreload = false;

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        // 预加载选项处理 支持数字来标记概率 0-1
        if (sdkConfig.params && sdkConfig.params.dontPreload != null) {
            let strDontPreload = sdkConfig.params.dontPreload;
            this.dontPreload = strDontPreload === 'true';
            if (!this.dontPreload) {
                let num = parseFloat(strDontPreload);
                if (!isNaN(num)) {
                    this.dontPreload = Math.random() < num;
                }
            }
        }
        if (this.dontPreload) {
            console.log('视频不预加载');
        }
        else {
            console.log('视频预加载');
        }
    }

    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        if (this.dontPreload) {
            this.enable = true;
            return;
        }
        let param = { adUnitId: this.config.id };
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
        }
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        this.playCb = cb;
        if (this.dontPreload) {
            if (!this.platObj) {
                let param = { adUnitId: this.config.id };
                let video = byteapi.createRewardedVideoAd(param);
                this.platObj = video;
            }
        }
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
                if (this.dontPreload) {
                    this.platObj.load().then(() => {
                        this.platObj.show();
                    }).catch(() => {
                        this.platObj.offClose(rcb);
                        if (cb) {
                            cb(false);
                        }
                    });
                }
                else {
                    console.log('视频广告展示失败：' + this.config.name + ' 错误:' + JSON.stringify(err));
                    this.platObj.offClose(rcb);
                    this.platObj.load();
                    this.enable = false;
                    if (cb) {
                        cb(false);
                    }
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
            return;
        }
        let param = { adUnitId: this.config.id };
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
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_BYTEDANCE) {
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
