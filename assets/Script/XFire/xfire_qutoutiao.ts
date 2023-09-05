/**
 * 趣头条小程序
 * 文档：https://newidea4-gamecenter-frontend.1sapp.com/sdk/docs/#/sdk/README
 * 账号接入：https://newidea4-gamecenter-frontend.1sapp.com/sdk/docs/#/server/gamecenter
 * 平台特性：
 *      1.需要自备下载服务器
 *      2.要获取用户信息必须进行服务端登录
 *      3.广告不需要配置id
 *      4.每个游戏需要单独联系趣头条商务进行广告开通
 *      5.平台必有账号
 *
 * 打包方法：
 *      1.发布为webmobile
 *      2.修改工程，当前打包插件已经支持，避免手动修改，备用手动修改方法：
 *          一.修改发布后的index.html，在<head></head>内末尾添加：<script type="text/javascript" src="//newidea4-gamecenter-frontend.1sapp.com/sdk/prod/h5.v1.0.0.js?spread=required"></script>
 *          二.修改main.js，搜索enableAutoFullScreen，将所在行代码改为cc.view.enableAutoFullScreen(false);关闭自动全屏
 *
 * 测试方法：
 *      1.将发布并修改好后的工程上传到【Y:/g/【项目编号】/h5/qutoutiao/test
 *      2.由赵米在后台配置好测试地址（点击后台按钮【应用key】），测试地址为【http://101.132.103.11/g/【项目编号】/h5/qutoutiao/test
 *      3.由赵米点击后台按钮【去测试】，获取弹出的网页地址，将地址发给开发
 *      4.测试时最好在chrome无痕窗口模式，打开开发者模式，激活开发工具栏左上角的手机设备图标，刷新
 *
 * 发布方法:
 *      1.正式版本上传到【Y:/g/【项目编号】/h5/qutoutiao/【版本号】
 *      2.正式版地址为【https://h5.orbn.top/g/【项目编号】/h5/qutoutiao/【版本号】
 */

import XFireApp, { AdCfg, BannerAd, InterstitialAd, LaunchOptions, LoginError, LoginResult, SdkCfg, ShareInfo, SystemInfo, VideoAd, XUserInfoButton, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const qttapi: any = (window as any).qttGame;
const win: any = window;
const qttHost = 'https://newidea4-gamecenter-backend.1sapp.com';
const xfireHost = 'https://minigame.orbn.top/minigame/json';

if (!cc.sys.platform === cc.sys.WECHAT_GAME && qttapi != null) {
    console.log('替换onshow');
    let justShown = false;
    let justHidden = false;
    win._inner_shown = () => {
        if (justShown) {
            return;
        }
        justShown = true;
        justHidden = false;

        if (!XFireAppQuTouTiao.getInstance()) {
            return;
        }
        if (!XFireAppQuTouTiao.getInstance().isVideoAdPlaying()) {
            cc.game.emit(cc.game.EVENT_SHOW);
        }
    };
    win._inner_hidden = () => {
        if (justHidden) {
            return;
        }
        justHidden = true;
        justShown = false;
        if (!XFireAppQuTouTiao.getInstance()) {
            return;
        }
        if (!XFireAppQuTouTiao.getInstance().isVideoAdPlaying()) {
            cc.game.emit(cc.game.EVENT_HIDE);
        }
    };
}

export default class XFireAppQuTouTiao extends XFireApp{
    private static validateNativeUserInfoResult(res: any): XUserInfoWithSignature {
        if (!res || !res.data) {
            return null;
        }
        let nickname = res.data.nickname;
        let avatar = res.data.avatar;
        let gender = '';
        let signature: any = {};
        return new XUserInfoWithSignature(nickname, avatar, gender, signature);
    }

    public constructor() {
        super();
        this.logined = true;
        this.plat = this.PLAT_QUTOUTIAO;
        this.supportGuestLogin = false;
    }

    public getAdSdkName(): string {
        return '趣头条小程序';
    }

    public supportLogin(): boolean {
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
            if (cc.sys.platform === cc.sys.WECHAT_GAME) {
                return;
            }
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
            let req: any = {};
            req.method = 'getQuTouTiaoUserInfo';
            let data: any = {};
            data.platform = this.getUrlParam('platform');
            data.ticket = this.getUrlParam('ticket');
            data.appid = this.appConfig.appid;
            req.data = data;

            this.httpGetJsonWithBody(xfireHost, req).then((ret) => {
                let json = ret.json;
                if (json == null || json.result !== 'ok' || json.data == null) {
                    let err = json == null ? ret.error : json.msg;
                    if (params.fail) {
                        params.fail(err);
                    }
                    resolve({error: err});
                }
                else {
                    let userInfo = XFireAppQuTouTiao.validateNativeUserInfoResult(ret);
                    if (params.success) {
                        params.success(userInfo);
                    }
                    resolve({userInfo});
                }
                if (params.complete) {
                    params.complete();
                }
            });
        });
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

    public login(param: {
            timeout?: number;                       // 超时时间，单位ms
            success?: (res: LoginResult) => void;
            fail?: (err: LoginError) => void;
            complete?: () => void;
        }= {}): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let platform = this.getUrlParam('platform');
        let ticket = this.getUrlParam('ticket');
        setTimeout(() => {
            if (ticket == null || ticket === '') {
                if (param.fail) {
                    param.fail({msg: 'invalid ticket'});
                }
            }
            else {
                this.logined = true;
                cc.sys.localStorage.setItem(XFireConfigs.平台账号登录标记, 'true');
                if (param.success) {
                    param.success({plat: this.plat, platform, ticket});
                }
            }
            if (param.complete) {
                param.complete();
            }
        }, 0);
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new BannerAdQuTouTiao(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdQuTouTiao(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new InterstitialAdQuTouTiao(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let { width, height } = cc.view.getVisibleSize();
        let info = qttapi.systemInfo;
        return {
            brand: info.brand,
            model: info.model,
            pixelRatio: 1,
            screenWidth: width,
            screenHeight: height,
            windowWidth: width,
            windowHeight: height,
            language: ''
        };
    }
}

class BannerAdQuTouTiao extends BannerAd{
    public static bannerShowing = false;
    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
    }

    public supportAutoRefresh() {
        return true;
    }
    public destroy(): void {
    }

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.platObj = {};
        setTimeout(() => {
            this.enable = true;
            if (this.toShow) {
                this.show();
            }
        }, 0);
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            qttapi.showBanner();
            BannerAdQuTouTiao.bannerShowing = true;
        }
    }

    protected nativeHide(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            qttapi.hideBanner();
            BannerAdQuTouTiao.bannerShowing = false;
        }
    }
}

class VideoAdQuTouTiao extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.platObj = {};
        setTimeout(() => {
            this.enable = true;
        }, 0);
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.playCb = cb;
        if (this.platObj != null) {
            let options = {
                gametype: 1,    // 互动游戏类型，1(砸金蛋)  2(laba)  3(大转盘)
                rewardtype: 1,  // 互动广告框，只有 1
                data: {
                    title: '刷新道具',  // 互动抽中奖后的道具提示文字 固定 无需修改
                    url: '//newidea4-gamecenter-frontend.1sapp.com/game/prod/fkxxl_img/1.png'
                }
            };
            cc.game.emit(cc.game.EVENT_HIDE);
            // 目前（2020年7月3日）平台没有处理好banner与视频的层级，手动关闭banner
            if (BannerAdQuTouTiao.bannerShowing) {
                qttapi.hideBanner();
            }
            qttapi.showVideo((res) => {
                setTimeout(() => {
                    cc.game.emit(cc.game.EVENT_SHOW);
                    if (cb) {
                        cb(res === 1);
                    }
                    if (BannerAdQuTouTiao.bannerShowing) {
                        qttapi.showBanner();
                    }
                }, 0);
            }, options);
        }
        else {
            if (cb) {
                cb(false);
            }
        }
    }
}

class InterstitialAdQuTouTiao extends InterstitialAd {
    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.platObj = {};
        setTimeout(() => {
            this.enable = true;
        }, 0);
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
            let options = {
                gametype: 1,    // 互动游戏类型，1(砸金蛋)  2(laba)  3(大转盘)
                rewardtype: 1,  // 互动广告框，只有 1
                data: {
                    title: '刷新道具',  // 互动抽中奖后的道具提示文字 固定 无需修改
                    url: '//newidea4-gamecenter-frontend.1sapp.com/game/prod/fkxxl_img/1.png'
                }
            };
            qttapi.showHDAD(options);
        }
    }
}
