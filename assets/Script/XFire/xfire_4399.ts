/*******************************************************************************
文件: xfire_4399.ts
创建: 2020年09月08日
作者: 老张(zwx@xfire.mobi)
描述:
    4399 h5 小游戏
    接口文档地址：https://www.4399api.com/doc/4399api/#/h5mini/base

平台特性：
    1.目前只上竖屏游戏

发布方法：
    1.安装最新的打包插件1.7.0及以上
    2.打包选择web-mobile平台，成功会生成4399文件夹，内有 【游戏名】.zip文件
    3.zip文件上传后台即可

测试方法：
    1.后台上传后会有个游戏预览链接可以进行测试
*******************************************************************************/

import XFireApp, { AdCfg, AppConfig, BannerAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const api: any = (window as any).h5api;

export default class XFireApp4399 extends XFireApp {
    public constructor() {
        super();
        this.plat = this.PLAT_4399;
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_4399) {
            return;
        }
        this.supportGuestLogin = false;
        // 由于4399的游戏可能跑在手机浏览器里，高宽比过低时调整为高度适配，两边留空
        Object.defineProperty(cc.Canvas.prototype, 'fitHeight', {
            set (value) {
                console.log('setFitHeight', cc.winSize);
            },
            get () {
                console.log('getFitHeight', JSON.stringify(cc.winSize));
                return cc.winSize.height / cc.winSize.width < 1280 / 720;
            }
        });
        Object.defineProperty(cc.Canvas.prototype, 'fitWidth', {
            set (value) {
                console.log('setFitWidth', cc.winSize);
            },
            get () {
                console.log('getFitWidth', JSON.stringify(cc.winSize));
                return cc.winSize.height / cc.winSize.width >= 1280 / 720;
            }
        });
    }

    public getAdSdkName(): string {
        return '4399小程序';
    }

    public supportLogin(): boolean {
        return false;
    }

    public supportVideoAd(): boolean {
        return true;
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_4399) {
            return;
        }
        return new VideoAd4399(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_4399) {
            return;
        }
        return {
            brand: navigator.vendor,
            model: navigator.appVersion,
            pixelRatio: 1,
            screenWidth: cc.view.getVisibleSize().width,
            screenHeight: cc.view.getVisibleSize().height,
            windowWidth: cc.view.getVisibleSize().width,
            windowHeight: cc.view.getVisibleSize().height,
            language: navigator.language
        };
    }
}

class VideoAd4399 extends VideoAd {
    // 广告有效性监视
    private monitor = false;

    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_4399) {
            return;
        }
        if (!this.monitor) {
            this.monitor = true;
            (async () => {
                while (true) {
                    await xfire.sleep(1);
                    if (this.enable) continue;
                    await xfire.sleep(1);

                    api.canPlayAd((data: { canPlayAd: boolean; remain: number }) => {
                        this.enable = data.canPlayAd;
                    });
                }
            })();
        }
        this.platObj = {};
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_4399) {
            return;
        }
        api.playAd((obj) => {
            if (obj.code === 10000) {
                console.log('开始播放');
            } else if (obj.code === 10001) {
                console.log('播放结束');
                cb(true);
            } else {
                console.log('广告异常');
                cb(false);
            }
        });
        this.enable = false;
    }
}
