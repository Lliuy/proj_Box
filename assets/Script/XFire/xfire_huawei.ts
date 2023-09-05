/**
 * 华为小程序
 * 接口文档地址 https://developer.huawei.com/consumer/cn/doc/development/quickApp-References/quickgame-api-canvas
 *
 * 平台特性：
 *
 * 发布方法：
 *      1.发布为华为快游戏即可打包出rpk
 *
 * 测试方法：
 *
 */

import XFireApp, { AdCfg, AppConfig, BannerAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const huaweiapi: any = (window as any).hbs;

interface HuaweiSystemInfo {
    COREVersion: string;
    brand: string;
    language: string;
    model: string;
    pixelRatio: number;
    platform: string;
    screenHeight: number;
    screenWidth: number;
    system: string;
    windowHeight: number;
    windowWidth: number;
}

let huaweiSystemInfo: HuaweiSystemInfo;

if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.HUAWEI_GAME) {
    huaweiapi.getSystemInfo({
        success(res: HuaweiSystemInfo) {
            huaweiSystemInfo = res;
        }
    });
}

export default class XFireAppHuawei extends XFireApp{

    public constructor() {
        super();
        this.plat = this.PLAT_HUAWEI;
        this.supportGuestLogin = false;
        if (cc.sys.platform !== cc.sys.HUAWEI_GAME) {
            console.error('XFireAppHuawei只可在华为环境下使用');
            return;
        }
    }

    public getAdSdkName(): string {
        return 'oppo小程序';
    }

    public supportVibrate(): boolean {
        return true;
    }

    public vibrateShort() {
        huaweiapi.vibrateShort();
    }

    public vibrateLong() {
        huaweiapi.vibrateLong();
    }

    public supportLogin(): boolean {
        return false;
    }

    public supportBannerAd(): boolean {
        return false;
    }

    public supportVideoAd(): boolean {
        return false;
    }

    public supportInterstitialAd(): boolean {
        return false;
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let info = null;
        if (typeof huaweiapi.getSystemInfoSync === 'function') {
            info = huaweiapi.getSystemInfoSync();
        }
        else if (huaweiSystemInfo != null) {
            info = huaweiSystemInfo;
        }
        if (info == null) {
            console.error('systemInfo尚未准备好');
            return null;
        }
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

}
