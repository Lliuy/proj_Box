/**
 * vivo小程序
 * 文档：http://minigame.vivo.com.cn/documents/#/lesson/open-ability/ad
 * 平台特性：
 *      1.如需联网需要在后台启用账号系统
 *      2.主包、分包不超4MB，总计不超8MB，【注】分包时vivo打包会额外打入个整包，估实际大小会翻倍
 *
 * 发布方法：
 *      1.先安装工具包：npm install -g qgame-toolkit
 *      2.发布为vivo工程，支持的最小平台版本号选择1054，发布目录为qgame
 *      3.将生成rpk拷贝到sd目录
 *      4.打开快应用调试器，选择本地安装
 */

import XFireApp, { AdCfg, BannerAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd } from './xfire_base';
import XFireConfigs from './xfire_config';

const vivoapi: any = (window as any).qg;
interface VivoLoginResult {
    state: string;
    code: string;
}
interface VivoSystemInfo {
    platformVersionName: string;
    brand: string;
    language: string;
    model: string;
    screenWidth: number;
    screenHeight: number;
}

let vivoSystemInfo: VivoSystemInfo;

if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.VIVO_GAME) {
    vivoapi.getSystemInfo({
        success(res: VivoSystemInfo) {
            vivoSystemInfo = res;
        }
    });

    // 撤销cocos注册的onShow，因为没有考虑视频播放情况
    if (true) {
        vivoapi.offShow();
        vivoapi.onShow(() => {
            if (!XFireAppVivo.getInstance()) {
                return;
            }
            if (!XFireAppVivo.getInstance().isVideoAdPlaying()) {
                cc.game.emit(cc.game.EVENT_SHOW);
            }
        });
    }
}

export default class XFireAppVivo extends XFireApp{

    public constructor() {
        super();
        this.plat = this.PLAT_VIVO;
        if (cc.sys.platform !== cc.sys.VIVO_GAME) {
            console.error('XFireAppVivo只可在VIVO环境下使用');
            return;
        }
    }

    public getAdSdkName(): string {
        return 'vivo小程序';
    }

    public mustArchiveOnline(): boolean {
        return true;
    }

    public supportVibrate(): boolean {
        return true;
    }

    public vibrateShort() {
        vivoapi.vibrateShort();
    }

    public vibrateLong() {
        vivoapi.vibrateLong();
    }

    public supportLogin(): boolean {
        return vivoapi.getSystemInfoSync().platformVersionCode >= 1053;
    }

    public supportBannerAd(): boolean {
        return true;
    }

    public supportVideoAd(): boolean {
        return (typeof vivoapi.createRewardedVideoAd) === 'function';
    }

    public supportInterstitialAd(): boolean {
        return true;
    }

    public supportShortcut(): boolean {
        return vivoapi && vivoapi.installShortcut != null;
    }

    public installShortcut(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            if (cc.sys.platform === cc.sys.WECHAT_GAME || !vivoapi.installShortcut) {
                resolve(false);
                return;
            }
            vivoapi.installShortcut({
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
            if (cc.sys.platform === cc.sys.WECHAT_GAME || !vivoapi.hasShortcutInstalled) {
                resolve(false);
                return;
            }
            vivoapi.hasShortcutInstalled({
                success: (res) => {
                    resolve(res === true);
                },
                fail: (err) => {
                    resolve(false);
                }
            });
        });
    }

    public supportClipboard() {
        return true;
    }

    public setClipboardData(content: string): Promise<boolean> {
        return new Promise<boolean> ((resolve) => {
            vivoapi.setClipboardData({
                text: content,
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
            vivoapi.getClipboardData({
                success: (res) => {
                    resolve(res.text);
                },
                fail: () => {
                    resolve('');
                }
            });
        });
    }

    public login(params: {
            timeout?: number;                       // 超时时间，单位ms
            success?: (res: LoginResult) => void;
            fail?: (err: LoginError) => void;
            complete?: () => void;
        }= {}): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }

        vivoapi.login().then((res) => {
            if (res.data.token) {
                if (params.success) {
                    params.success({plat: this.plat, token: res.data.token });
                }
            }
            else {
                if (params.fail) {
                    params.fail({msg: '失败:没有token'});
                }
            }
            if (params.complete) {
                params.complete();
            }
        }, (err) => {
            if (params.fail) {
                params.fail({msg: '失败:' + JSON.stringify(err)});
            }
            if (params.complete) {
                params.complete();
            }
        });
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new BannerAdVivo(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdVivo(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new InterstitialAdVivo(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let info = null;
        if (typeof vivoapi.getSystemInfoSync === 'function') {
            info = vivoapi.getSystemInfoSync();
        }
        else if (vivoSystemInfo != null) {
            info = vivoSystemInfo;
        }
        if (info == null) {
            console.error('systemInfo尚未准备好');
            return null;
        }
        return {
            brand: info.brand,
            model: info.model,
            pixelRatio: 1,
            screenWidth: info.screenWidth,
            screenHeight: info.screenHeight,
            windowWidth: info.screenWidth,
            windowHeight: info.screenHeight,
            language: info.language
        };
    }

}

class BannerAdVivo extends BannerAd{
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
        this.enable = true;
    }

    public destroy(): void {
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }

        if (this.platObj != null) {
            this.platObj.show().then(() => {
                console.log('banner广告展示成功：' + this.config.name);
            }).catch((err) => {
                console.log('banner广告展示失败：' + this.config.name + ' 错误：' + JSON.stringify(err));
                this.platObj = null;
                this.nativeShow();
            });
            return;
        }

        let banner = vivoapi.createBannerAd({posId: this.config.id, style: {}});
        this.platObj = banner;
        if (banner == null) {
            console.log('banner广告创建失败：' + this.config.name);
        }
        else {
            banner.onLoad(() => {
                console.log('banner广告加载成功：' + this.config.name);
                if (this.visible) {
                    this.platObj.show().then(() => {
                        console.log('banner广告展示成功：' + this.config.name);
                        setTimeout(() => {
                            if (!this.visible && this.platObj) {
                                this.platObj.hide();
                            }
                        }, 0);
                    }).catch((err) => {
                        console.log('banner广告展示失败：' + this.config.name + ' 错误：' + JSON.stringify(err));
                        this.visible = false;
                        this.platObj = null;
                    });
                }
            });
            banner.onError((res) => {
                console.log('banner广告出错：' + this.config.name + ' 错误：' + JSON.stringify(res));
                this.visible = false;
                this.platObj = null;
            });
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

class VideoAdVivo extends VideoAd{
    private playCb: (end: boolean) => void = null;
    private loading = false;
    private lastLoadTime = 0;
    private playing = false;
    private playingMusic = false;
    private limitTime = 0;      // 限制时间内不能再播放视频

    public isReady(): boolean {
        return this.enable && this.limitTime === 0;
    }

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let param = {posId: this.config.id};
        let video = vivoapi.createRewardedVideoAd(param);
        if (video != null) {
            this.platObj = video;
            this.loading = true;
            this.lastLoadTime = new Date().getTime();
            video.onError((err: any) => {
                console.error('视频广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
                this.enable = false;
                this.loading = false;
                this.playing = false;
            });
            video.onLoad(() => {
                console.log('视频广告加载成功：' + this.config.name);
                this.enable = true;
                this.loading = false;
            });
            video.onClose((res) => {
                try {
                    if (this.playingMusic) {
                        cc.audioEngine.resumeMusic();
                    }
                    cc.game.emit(cc.game.EVENT_SHOW);
                    if (res) {
                        if (this.playCb != null) {
                            this.playCb(res.isEnded === true);
                            this.playCb = null;
                        }
                    }
                    this.enable = false;
                    this.playing = false;
                } catch (error) {
                    console.log('video.onClose error:' + JSON.stringify(error));
                }

            });
            // video.load();    // vivo平台在创建视频广告时会自动进行一次加载
        }
        else {
            this.platObj = null;
            this.enable = false;
        }
    }

    public destroy(): void {
    }

    public update(dt: number, idleTime: number): void {
        this.limitTime -= dt;
        if (this.limitTime < 0) {
            this.limitTime = 0;
        }
        if (this.playing || this.enable || this.loading || this.lastLoadTime === 0) {
            return;
        }
        let curTime = new Date().getTime();
        let off = (curTime - this.lastLoadTime) / 1000;
        if (off > XFireConfigs.vivo视频加载重试间隔) {
            this.reload();
        }
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.playCb = cb;
        if (this.platObj != null) {
            this.platObj.show()
                .then(() => {
                    // vivo构建出的代码没有在onhide里暂停直接使用cc.audioEngine播放的音乐
                    this.playingMusic = cc.audioEngine.isMusicPlaying();
                    if (this.playingMusic) {
                        cc.audioEngine.pauseMusic();
                    }
                    cc.game.emit(cc.game.EVENT_HIDE);
                    console.log('视频广告展示成功：' + this.config.name);
                    this.playing = true;
                    this.limitTime = XFireConfigs.vivo视频播放间隔限制;
                }).catch((err) => {
                    console.log('视频广告展示失败：' + this.config.name + ' 错误:' + JSON.stringify(err));
                    this.enable = false;
                });
        }
    }

    private reload() {
        console.log('请求加载视频：' + this.config.name);
        this.enable = false;
        this.loading = true;
        this.lastLoadTime = new Date().getTime();
        this.platObj.load().then(() => {
        }).catch((err) => {
        });
    }
}

class InterstitialAdVivo extends InterstitialAd {
    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.enable = true;
    }

    public destroy(): void {
    }

    public update(dt: number, idleTime: number): void {
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }

        let param = {posId: this.config.id};
        let ad = vivoapi.createInterstitialAd(param);
        if (ad != null) {
            this.platObj = ad;
            ad.onError((err: any) => {
                console.log('插屏广告加载失败：' + this.config.name + ' 错误：' + JSON.stringify(err));
            });
            ad.onLoad(() => {
                console.log('插屏广告加载成功：' + this.config.name);
                this.platObj.show().catch((err) => {
                    console.log('插屏广告展示失败：' + this.config.name + ' 错误：' + JSON.stringify(err));
                });
            });
        }
    }
}
