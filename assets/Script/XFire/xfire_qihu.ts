/**
 * 奇虎小程序
 * 接口文档地址 https://mp.360.cn/doc/minigame/dev/#/a52e62f95a681228a01bc4de0acba959
 *
 * 平台特性：
 *      目前（2019年12月20日）主要在PC端360浏览器里运行
 *      【注意】在1366*768的显示器上，游戏实际的窗口高仅687，对应的16：9宽度为386
 *
 * 构建方法：
 *      1.安装打包插件1.0.3或以上
 *      2.在配置文件xhappcfg里配置好【奇虎小程序】
 *      3.构建微信工程
 *      4.会在build目录下自动基于微信工程生成 qihu 文件夹
 *
 * 测试方法：
 *      1.安装【360安全浏览器】
 *      2.【360安全浏览器】【菜单】-》【设置】-》【高级设置】最下方-》打开小程序开发者模式，左侧会出现【小程序开发者模式】
 *      3.进入【小程序开发者模式】并登录
 *      4.添加项目，目录选择构建出来的/build/qihu，不能选择/build/qihu/dist
 *      5.完成添加后，项目右上角有【调试】【上传代码】
 *
 * 正式发布：
 *      1.【360安全浏览器】登录公司账号
 *      2.参考【测试方法】找到项目，点击项目右上角【上传代码】
 */

import XFireApp, { AdCfg, AppConfig, BannerAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const qhapi: any = (window as any).qh;

export default class XFireAppQihu extends XFireApp{

    public constructor() {
        super();
        this.plat = this.PLAT_QIHU;
        this.supportGuestLogin = false;
    }

    public getAdSdkName(): string {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        return '奇虎小程序';
    }

    public supportLogin(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        return false;
    }

    public supportBannerAd(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        return false;
    }

    public supportVideoAd(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        return true;
    }

    public supportInterstitialAd(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        return false;
    }

    public supportShortcut(): boolean {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        return qhapi.isOnDesktopSync != null;
    }

    public installShortcut(): Promise<boolean> {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        return new Promise<boolean>((resolve) => {
            if (!qhapi.addAppToDesktop) {
                resolve(false);
                return;
            }
            qhapi.addAppToDesktop({
                success: (data) => {
                    resolve(data === 0);
                },
                fail: (err) => {
                    resolve(false);
                }
            });
        });
    }

    public hasShortcutInstalled(): Promise<boolean> {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        return new Promise<boolean>((resolve) => {
            if (!qhapi.isOnDesktopSync) {
                resolve(false);
                return;
            }
            resolve(qhapi.isOnDesktopSync());
        });
    }

    public getSystemInfoSync(): SystemInfo {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        let info = qhapi.getSystemInfoSync();
        return {
            brand: info.brand || '',
            model: info.model || '',
            pixelRatio: 1,
            screenWidth: info.screenWidth,
            screenHeight: info.screenHeight,
            windowWidth: info.windowWidth,
            windowHeight: info.windowHeight,
            language: info.language
        };
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        return new BannerAdQiHu(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        return new VideoAdQiHu(sdkConfig, cfg);
    }
}

class BannerAdQiHu extends BannerAd{

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
    }

    public supportAutoRefresh() {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        return true;
    }

    public destroy(): void {
    }

    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }

        let sysInfo = qhapi.getSystemInfoSync();
        let genBannerAdStyle = (style: {left?: number; bottom?: number; width?: number; height?: number}): any => {
            let ratio = cc.view.getVisibleSize().width / sysInfo.windowWidth;
            let left = style.left;
            let top = cc.view.getVisibleSize().height - style.height - style.bottom;
            return {left: left / ratio, top: top / ratio, width: style.width / ratio, height: style.height / ratio};
        };

        let style = genBannerAdStyle(this.config.style);
        console.log('Style:', style);
        let param = {adUnitId: this.config.id, adIntervals: 30, style};
        let banner = qhapi.createBannerAd(param);
        this.platObj = banner;
        if (banner == null) {
            console.log('创建banner失败');
        }
        else {
            console.log('创建banner成功');
            banner.onLoad(() => {
                console.log('banner加载成功');
                this.enable = true;
                if (this.toShow) {
                    this.show();
                }
            });
            banner.onError((res: any) => {
                this.enable = false;
            });
        }
    }

    protected nativeShow(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.show();
        }
    }

    protected nativeHide(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.hide();
        }
    }
}

class VideoAdQiHu extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
            return;
        }
        let param = {adUnitId: this.config.id};
        let video = qhapi.createRewardedVideoAd(param);
        this.platObj = video;
        if (video == null) {
            console.log('创建video失败');
        }
        else {
            console.log('创建video成功');
            video.onLoad(() => {
                this.enable = true;
                console.log('视频广告加载成功');
            });
            video.onError((res: any) => {
                this.enable = false;
                console.log('视频异常' + JSON.stringify(res));
            });
        }
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (!cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_QIHU) {
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
                this.enable = false;
                this.platObj.load();
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
