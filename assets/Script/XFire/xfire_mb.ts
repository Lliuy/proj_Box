/**
 * 移动浏览器
 */
import XFireApp, { LaunchOptions, SystemInfo } from './xfire_base';
import XFireAppDB from './xfire_db';

export default class XFireAppMB extends XFireAppDB{

    public constructor() {
        super();
        this.plat = this.PLAT_MOBILE_BROWSER;
        if (cc.sys.platform !== cc.sys.MOBILE_BROWSER) {
            console.error('XFireAppMB只可在移动浏览器环境下使用');
        }
    }

    public getAdSdkName(): string {
        return '移动浏览器';
    }

    public getSystemInfoSync(): SystemInfo {
        if ((cc.sys.platform === cc.sys.WECHAT_GAME)) {
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
