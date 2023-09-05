/**
 * 快手小程序
 * 平台特性：
 *      1.必有账号
 *      2.需要云存储
 *      3.需要自备下载服务器
 *      4.广告不需要配置id
 *
 * 打包方法：
 *      1.安装1.1.0及以上打包插件
 *      2.发布为webmobile，会在build目录下生成kuaishou文件夹
 *
 * 测试方法：
 *      1.将发布并修改好后的工程上传到【Y:/g/【项目编号】/kuaishou/test
 *      2.由运营部署到快手后台
 *      3.最终在手机上使用快手app测试
 *
 * 查看日志方法：
 *      1.构建时勾选vConsole，正式版本要去掉
 *
 * 发布方法:
 *      1.将构建出的kuaishou文件夹内文件上传到【Y:/g/【项目编号】/kuaishou/【版本号】
 *      2.正式版地址为【https://h5.orbn.top/g/【项目编号】/kuaishou/【版本号】
 *
 * 服务器登录校验（本信息与客户端无关）：
 *      请求时快手app会对请求追加user-agent，示例： user-agent:Mozilla/5.0 (Linux; Android 9; vivo Z3x Build/PKQ1.180819.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045318 Mobile Safari/537.36kuaishou-game-an
 */

import XFireApp, { AdCfg, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd } from './xfire_base';

const win: any = window;

if (cc.sys.platform === cc.sys.MOBILE_BROWSER && (typeof XH_PLAT === 'undefined' || XH_PLAT === 'kuaishou')) {
    // 视频广告状态
    win._ksadVideoReady = false;
    // 全屏广告状态
    win._ksadInterstitialReady = false;
    // 激励视频广告回调
    win._ksadVideoCallback = null;
    // 激励视频播放结束，可以给予奖励
    win._ksadVideoPlayed = false;
    // 获取用户信息回调
    win._ksadUserInfoCbs = [];

    // 快手的方法调用器
    let caller = win.ksCaller = (method: string, _params: any = {}) => {
        let params = _params || {};
        let strParams = '';
        for (let attr in params) {
            if (!params.hasOwnProperty(attr)) {
                continue;
            }
            if (strParams.length) {
                strParams += '&';
            }
            strParams += encodeURIComponent(attr);
            strParams += '=';
            strParams += encodeURIComponent(params[attr]);
        }
        let link = 'cheetahbridge://' + method + '?' + strParams;
        let iframe = document.createElement('iframe');
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.display = 'none';
        iframe.src = link;
        document.body.appendChild(iframe);
        setTimeout(() => {
            iframe.remove();
        }, 100);
    };

    // 起一个循环监听广告状态
    {
        let watcher = () => {
            setTimeout(() => {
                caller('isAdReady', {adType: 1});
                caller('isAdReady', {adType: 2});
                watcher();
            }, 1000);
        };
        watcher();
    }

    win.onAdReady = (adType: number, isReady: boolean) => {
        if (adType === 1) {
            if (!win._ksadVideoReady && isReady) {
                console.log('视频广告加载成功');
            }
            win._ksadVideoReady = isReady;
        }
        else {
            if (!win._ksadInterstitialReady && isReady) {
                console.log('插屏广告加载成功');
            }
            win._ksadInterstitialReady = isReady;
        }
    };

    win.onVideoPlayStart = (adType: number) => {
        console.log('onVideoPlayStart:' + adType);
    };

    win.onAdAwardResult = (awardSuc: boolean) => {
        console.log('onAdAwardResult:' + awardSuc);
        win._ksadVideoPlayed = awardSuc;
    };

    win.onAdClose = (adType: number, closeType: number) => {
        console.log(`onVideoPlayStart:${adType} ${closeType}`);
        if (adType === 1 && win._ksadVideoCallback) {
            win._ksadVideoCallback(win._ksadVideoPlayed);
        }
    };

    /** 已被平台弃用 */
    win.onGetUserId = (userId: string) => {
    };

    win.onGetUserInfo = (id: string, name: string, avatar: string) => {
        let cbs: ((id: string, name: string, avatar: string) => void)[] = win._ksadUserInfoCbs || [];
        win._ksadUserInfoCbs = [];
        cbs.forEach((cb) => {
            if (cb) cb(id, name, avatar);
        });
    };
}

export default class XFireAppKuaiShou extends XFireApp{
    public constructor() {
        super();
        this.logined = true;
        this.plat = this.PLAT_KUAISHOU;
        this.supportGuestLogin = false;
    }

    public getAdSdkName(): string {
        return '快手小程序';
    }

    public mustArchiveOnline(): boolean {
        return true;
    }

    public supportLogin(): boolean {
        return true;
    }

    public supportVideoAd(): boolean {
        return true;
    }

    public supportInterstitialAd(): boolean {
        return true;
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }
        return new VideoAdKuaiShou(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }
        return new InterstitialAdKuaiShou(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }
        let { width, height } = cc.view.getVisibleSize();
        return {
            brand: '',
            model: '',
            pixelRatio: 1,
            screenWidth: width,
            screenHeight: height,
            windowWidth: width,
            windowHeight: height,
            language: 'zh_CN'
        };
    }

    public login(param: {
        timeout?: number;                       // 超时时间，单位ms
        success?: (res: LoginResult) => void;
        fail?: (err: LoginError) => void;
        complete?: () => void;
    }= {}): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }
        let cb = (id: string, name: string, avatar: string) => {
            if (param.success) {
                param.success({plat: this.plat, userid: id, avatar, nickname: name});
            }
            if (param.complete) {
                param.complete();
            }
        };
        win._ksadUserInfoCbs.push(cb);
        win.ksCaller('getUserInfo');
    }
}

class VideoAdKuaiShou extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }
        this.platObj = {};
    }

    public isReady(): boolean {
        return win._ksadVideoReady;
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }
        cc.game.emit(cc.game.EVENT_HIDE);
        win._ksadVideoPlayed = false;
        win._ksadVideoCallback = (end: boolean) => {
            cc.game.emit(cc.game.EVENT_SHOW);
            cb(end);
        };
        win.ksCaller('showAd', {adType: 1});
    }
}

class InterstitialAdKuaiShou extends InterstitialAd {
    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }
        this.platObj = {};
    }

    public isReady(): boolean {
        return win._ksadInterstitialReady;
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }
        win.ksCaller('showAd', {adType: 2});
    }
}
