/**
 * UC小程序
 * 文档：https://minigame.uc.cn/api/login#cXJFb
 * 平台特性：
 *
 * 发布方法：
 *      1.发布为web mobile工程，构建后记录构建页预览URL
 *      2.修改工程，当前打包插件已经支持，避免手动修改，备用手动修改方法：
 *              一、【如果使用了弱联网功能】在发布出的工程下添加配置文件uc.config.json，填写如下域名配置：{"crossDomainList": ["sg.orbn.top", "minigame.orbn.top"]}
 *      3.android手机安装调试器（开发版UC浏览器）：https://minigame.uc.cn/intro/guide/develop
 *      4.手机开调试模式后接入电脑
 *      5.打开chrome，地址栏输入：chrome://inspect，此时正确的话应该看到手机显示在下方
 *      6.[本地调试]确保手机与电脑在同一网络，手机上uc浏览器输入地址并浏览uclink://minigame?action=launch&module=uc_minigame&appid=xxx&clientid=xxx&game_name=xxx&game_icon=xxx&game_url=xxx，例如
 *          uclink://minigame?action=launch&module=uc_minigame&appid=3b2fa6e36c8a4cfa9a7dabfac92e2206&clientid=9da4703b48ba4c7abc106af53fc03d2a&game_name=蛋糕不能掉&game_icon=imgcdn.orbn.top/g/048/nav/icon/001.png&game_url=192.168.1.92:7456/build
 *      6.[正式包上传后扫码]也可以调试
 *      7.正常的话电脑上chrome会显示uc浏览器打开的页面，选择我们的应用下方的inspect进入调试模式
 *      8.正式发布将构建出的工程打包为zip发给商务，注意不要有目录嵌套，zip打开第一层即为工程
 */

import XFireApp, { AdCfg, BannerAd, LaunchOptions, LoginError, LoginResult, SdkCfg, ShareInfo, SystemInfo, VideoAd, XMoreGamesButton, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const ucapi: any = (window as any).uc;
const xfireHost = 'https://minigame.orbn.top/minigame/json';
// const xfireHost = 'http://192.168.1.98/MiniGame/json';

export default class XFireAppUC extends XFireApp{
    private static validateNativeUserInfoResult(res: any): XUserInfoWithSignature {
        if (!res) {
            return null;
        }
        let nickname = res.nickname;
        let avatar = res.avatar_url;
        let gender = '';
        let signature: any = {};
        return new XUserInfoWithSignature(nickname, avatar, gender, signature);
    }

    private cashedUserInfo: XUserInfoWithSignature = null;

    public constructor() {
        super();
        this.plat = this.PLAT_UC;
        if (ucapi == null || typeof ucapi.getSystemInfoSync !== 'function') {
            console.error('XFireAppUC只可在uc小游戏环境下使用');
        }
        /*
        ucapi.login({
            success: (res) => {
              console.log('登录成功', res.code);
            },
            fail: (res) => {
              console.log('登录失败', res);
            }
        });
        ucapi.getGuestInfo({
            success: (data) => {
              console.log(data);
            },
            fail: (data) => {
              console.error(data);
            }
        });

        ucapi.getUserInfo({
            success: (data) => {
              console.log(data);
            },
            fail: (data) => {
              console.error(data);
            }
        });*/
    }

    public getAdSdkName(): string {
        return 'uc小程序';
    }

    public supportLogin(): boolean {
        return true;
    }

    public supportMiniProgramNavigate(): boolean {
        return false;
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
            ucapi.getSetting({
                success: (res: any) => {
                    let result: any = {};
                    result[this.SCOPE_USERINFO] = res.userInfo === true;
                    result[this.SCOPE_USERLOCATION] = res.userLocation === true;
                    result[this.SCOPE_WRITEPHOTOSALBUM] = res.writePhotosAlbum === true;
                    result[this.SCOPE_CAMERA] = res.camera === true;
                    result[this.SCOPE_RECORD] = res.mic === true;
                    if (lParams.success) {
                        lParams.success(result);
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({authSetting: result});
                },
                fail: (err) => {
                    let error = JSON.stringify(err);
                    if (lParams.fail) {
                        lParams.fail(error);
                    }
                    if (lParams.complete) {
                        lParams.complete();
                    }
                    resolve({error});
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
        }>((resolve) => {
            if (cc.sys.platform === cc.sys.WECHAT_GAME) {
                return;
            }

            // 是否有缓存的用户信息
            if (this.cashedUserInfo) {
                setTimeout(() => {
                    if (params.success) {
                        params.success(this.cashedUserInfo);
                    }
                    resolve({userInfo: this.cashedUserInfo});
                }, 0);
                return;
            }
            // 复用获取函数
            let fnGet = () => {
                this.nativeGetUserInfoWithAutoAuthorize({
                    success: (info: XUserInfoWithSignature) => {
                        if (params.success) {
                            params.success(info);
                        }
                        if (params.complete) {
                            params.complete();
                        }
                        this.cashedUserInfo = info;
                        resolve({userInfo: info});
                    },
                    fail: (err) => {
                        if (params.fail) {
                            params.fail(err);
                        }
                        if (params.complete) {
                            params.complete();
                        }
                        resolve({error: JSON.stringify(err)});
                    }
                });
            };
            // session检查
            ucapi.checkSession({
                success: () => {
                    fnGet();
                },
                fail: () => {
                    // 激活session
                    this.activeSession({
                        success: () => {
                            fnGet();
                        },
                        fail: (err) => {
                            if (params.fail) {
                                params.fail(err);
                            }
                            if (params.complete) {
                                params.complete();
                            }
                            resolve({error: JSON.stringify(err)});
                        }
                    });
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
        return false;
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
        ucapi.login({
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

    public supportShare(): boolean {
        return true;
    }

    public showShareMenu(): void {
    }

    public hideShareMenu(): void {
    }

    public shareAppMessage(shareInfo: ShareInfo): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let info = {
            title: shareInfo.title,
            imageUrl: shareInfo.imageUrl,
            query: shareInfo.query || '',
            success: (res) => {
                if (shareInfo.success) {
                    shareInfo.success();
                }
                if (shareInfo.complete) {
                    shareInfo.complete();
                }
            },
            fail: (err) => {
                console.log('分享失败：' + JSON.stringify(err));
                if (shareInfo.fail) {
                    shareInfo.fail();
                }
                if (shareInfo.complete) {
                    shareInfo.complete();
                }
            }
        };
        ucapi.shareAppMessage(info);
    }

    public onShareAppMessage(cb: () => ShareInfo): void {
    }

    public offShareAppMessage(cb: () => ShareInfo): void {
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new BannerAdUC(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdUC(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let info: any = ucapi.getSystemInfoSync();
        if (typeof info === 'string') {
            info = JSON.parse(info);
        }
        return {
            brand: info.brand,
            model: info.model,
            pixelRatio: info.pixelRatio,
            screenWidth: info.screenWidth,
            screenHeight: info.screenHeight,
            windowWidth: info.windowWidth,
            windowHeight: info.windowHeight,
            language: ''
        };
    }

    private activeSession(params: {
        success?: () => void;
        fail?: (err: string) => void;
    }) {
        this.login({
            success: (res) => {
                let req: any = {};
                req.method = 'activeUCSession';
                let data: any = {};
                data.code = res.code;
                data.appid = this.appConfig.appid;
                req.data = data;

                this.httpGetJsonWithBody(xfireHost, req).then((ret) => {
                    let json = ret.json;
                    if (json == null || json.result !== 'ok' || json.data == null) {
                        if (params.fail) {
                            params.fail(json == null ? ret.error : json.msg);
                        }
                    }
                    else {
                        if (params.success) {
                            if (params.success) {
                                params.success();
                            }
                        }
                    }
                });
            }
        });
    }

    private nativeGetUserInfoWithAutoAuthorize(params: {
        success?: (info: XUserInfoWithSignature) => void;
        fail?: (err: string) => void;
    }) {
        // 取用户信息功能 复用
        let fnGet = () => {
            ucapi.getUserInfo({
                success: (data) => {
                    if (params.success) {
                        let userInfo = XFireAppUC.validateNativeUserInfoResult(data);
                        params.success(userInfo);
                    }
                },
                fail: (data) => {
                    if (params.fail) {
                        params.fail(JSON.stringify(data));
                    }
                }
            });
        };
        // 权限判断
        this.getSetting({
            success: (authSetting) => {
                // 未授权则请求授权
                if (!authSetting[this.SCOPE_USERINFO]) {
                    ucapi.authorize({
                        scope: 'userInfo',
                        success: (data) => {
                            fnGet();
                        },
                        fail: (data) => {
                            if (params.fail) {
                                params.fail('授权失败');
                            }
                        }
                    });
                }
                else {
                    fnGet();
                }
            },
            fail: (err) => {
                if (params.fail) {
                    params.fail(JSON.stringify(err));
                }
            }
        });
    }

}

class BannerAdUC extends BannerAd{
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

        let sysInfo = XFireAppUC.getInstance().getSystemInfoSync();
        let designSize = cc.view.getVisibleSize();
        let ratio = designSize.width / sysInfo.screenWidth;
        let width = Math.min(sysInfo.screenWidth, sysInfo.screenHeight);
        let height = width * 150 / 600;
        let param = {style: {gravity: 7, width, height}};
        let banner = ucapi.createBannerAd(param);
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

// 字节跳动的视频会自动更换源 无需反复销毁创建
class VideoAdUC extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let video = ucapi.createRewardVideoAd();
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
            video.onClose((res: any) => {
                console.log('视频广告关闭：' + this.config.name);
                if (this.playCb != null) {
                    this.playCb(res.isEnded === true);
                }
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
            this.platObj.show()
                .then(() => {

                }).catch((err) => {
                    console.log(err);
                    if (cb) {
                        cb(false);
                    }
                });
        }
    }

}
