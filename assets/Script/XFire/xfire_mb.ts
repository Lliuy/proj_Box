/**
 * 移动浏览器
 */
import XFireApp, { LaunchOptions, SystemInfo } from './xfire_base';
import XFireAppDB from './xfire_db';

export default class XFireAppMB extends XFireAppDB{
    /** 加速度监听函数 */
    private accCb: (eventData: DeviceMotionEvent) => void = null;

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
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
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

    public supportAccelerometer(): boolean {
        return window.DeviceMotionEvent != null;
    }

    public startAccelerometer() {
        if (window.DeviceMotionEvent == null) {
            return;
        }
        if (this.accCb == null) {
            this.accCb = (eventData: DeviceMotionEvent) => {
                let acc = eventData.accelerationIncludingGravity;
                if (acc == null) {
                    return;
                }
                let g = 9.80665;
                this.dispatchAccelerometerChange(-acc.x / g, -acc.y / g, -acc.z / g);
            };
        }
        window.removeEventListener('devicemotion', this.accCb);
        window.addEventListener('devicemotion', this.accCb);
    }

    public stopAccelerometer() {
        window.removeEventListener('devicemotion', this.accCb);
    }
}
