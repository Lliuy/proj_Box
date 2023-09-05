/**
 * 雪鲤鱼小游戏
 * 文档：炫火\SDK\雪鲤鱼
 *
 * 平台特性：
 *      1.广告不需要申请id，自己从1开始编号即可
 *
 * 注意事项：
 *      1.关卡开始时需要调用xfire.analyzerStageEnter(关卡id)
 *      2.关卡结束时需要调用xfire.analyzerStageEnd(关卡id, 成功与否)
 *
 * 测试方法：
 *      1.安装1.0.4以上的打包插件
 *      2.发布为webmobile工程，插件会生成snowfish文件夹
 *      3.将snowfish文件夹拷贝到Z:\内网站点，重命名文件夹，如xmlb
 *      4.浏览器打开http://192.168.1.10/xmlb
 *
 * 发布方法：
 *      1.将snowfish下的文件打成zip压缩包，注意不要有嵌套目录
 */

import XFireApp, { AdCfg, AppConfig, BannerAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

let sfapi: any = (window as any).$SF;
const win: any = window;

if (!cc.sys.platform === cc.sys.WECHAT_GAME && sfapi != null) {
    win._inner_shown = () => {
    };
    win._inner_hidden = () => {
    };
    sfapi.Ga.onResume(() => {
        if (!XFireAppSnowFish.getInstance()) {
            return;
        }
        if (!XFireAppSnowFish.getInstance().isVideoAdPlaying()) {
            cc.game.emit(cc.game.EVENT_SHOW);
        }
    });
    sfapi.Ga.onPause(() => {
        if (!XFireAppSnowFish.getInstance()) {
            return;
        }
        if (!XFireAppSnowFish.getInstance().isVideoAdPlaying()) {
            cc.game.emit(cc.game.EVENT_HIDE);
        }
    });
    cc.sys.localStorage = sfapi.sfLocalStorage;
}

export default class XFireAppSnowFish extends XFireApp{

    public constructor() {
        super();
        this.plat = this.PLAT_SNOWFISH;
        this.supportGuestLogin = false;
        if (sfapi == null) {
            console.error('XFireAppKXW只可在雪鲤鱼环境下使用');
            return;
        }
    }

    public getAdSdkName(): string {
        return '雪鲤鱼小程序';
    }

    public supportVibrate(): boolean {
        return true;
    }

    public vibrateShort() {
        sfapi.Ga.startVib(15);
    }

    public vibrateLong() {
        sfapi.Ga.startVib(400);
    }

    // 统计：关卡开始
    public analyzerStageEnter(stageId: number, userId?: string) {
        sfapi.Ga.onGameStart(() => {});
    }

    // 统计: 关卡结束
    public analyzerStageEnd(stageId: number, succ: boolean, score?: number, userId?: string) {
        sfapi.Ga.onGameEnd({
            score: score == null ? 0 : score,
            level: stageId,
            win: succ ? 1 : 2
        }, () => {});
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

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new BannerAdSnowFish(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdSnowFish(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new InterstitialAdSnowFish(sdkConfig, cfg);
    }

    public exit() {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        sfapi.Ga.back(false);
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
}

class BannerAdSnowFish extends BannerAd{
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
        this.platObj = {};
        setTimeout(() => {
            this.enable = true;
            if (this.toShow) {
                this.show();
            }
        }, 0);
    }

    public destroy(): void {
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        sfapi.Ga.showBa(parseInt(this.config.id, 10), false, (ret) => {
        });
    }

    protected nativeHide(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        sfapi.Ga.hideBa();
    }
}

class VideoAdSnowFish extends VideoAd{

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.enable = true;
        this.platObj = {};
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        sfapi.Ga.playRewardVideo(parseInt(this.config.id, 10), (ret: number) => {
            console.log('playVideo cb:' + ret);
            if (cb) {
                cb(ret === 2);
            }
        }, cc.view.getVisibleSize().width > cc.view.getVisibleSize().height);
    }
}

class InterstitialAdSnowFish extends InterstitialAd {
    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        this.enable = true;
        this.platObj = {};
    }

    public destroy(): void {
    }

    public update(dt: number, idleTime: number): void {
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        sfapi.Ga.playRewardVideo(parseInt(this.config.id, 10), (ret: number) => {
        }, cc.view.getVisibleSize().width > cc.view.getVisibleSize().height);
    }
}
