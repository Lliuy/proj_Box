/**
 * 推特旗下 mopub聚合广告
 *       文档：https://developers.mopub.com/publishers/android/integrate/
 *       ✦操作：
 *
 * Fyber FairBid聚合广告
 *      文档：https://developer.fyber.com/hc/en-us/articles/360013580478-Android-Ad-Formats
 *      ✦操作
 *          1.勾选支持平台https://developer.fyber.com/hc/en-us/articles/360010077777-Supported-Networks
 *          2.勾选后下方会出现gradle的集成脚本
 *
 * 小米
 *      游戏sdk接入流程：https://dev.mi.com/console/doc/detail?pId=1952
 *      单机sdk：https://dev.mi.com/console/doc/detail?pId=1280
 *      广告需要小米手机
 *      游戏有内购：需要接网游SDK
 *      游戏只有广告：需要接单机SDK+广告SDK
 *      游戏有内购有广告：需要接网游SDK+广告SDK
 * oppoo
 *      提示初始化失败需注意secret是否配置
 *
 * facebook
 *      可以通过topon集成，topon里facebook的应用id可以使用广告位id的前半段，如
 *      某个facebook视频广告点的广告位id为1734182910097885_1734184286764414，这topon
 *      里facebook的应用id可以填写为1734182910097885
 *      ✦测试方法：国内测试可能存在填充率问题，此时可以开启测试模式
 *          1.安装facebook
 *          2.获取手机的aaid，如nexus5上，访问设置-》Google-》广告-》您的广告id
 *          3.进入facebook 盈利管理工具https://business.facebook.com/pub
 *          4.进入 整合-》测试
 *          5.打开测试开关，可以勾选使用真实的广告
 *          6.在下方填写aaid添加测试设备
 *
 * 爱奇艺
 *      上线他们会重新签名，所以360加固时要在加固软件的基础设置里勾选跳过签名验证。
 * 4399
 *      广告位需要对方商务配置，否则无法展示。
 * 金立
 *      分单机sdk + 广告sdk
 *      https://dev-game.gionee.com/help/sdk.html
 *
 * android真机调试方法：
 *      1.使用debug版本模板打包
 *      2.真机安装，连接与电脑同网wifi
 *      3.打开电脑chrome浏览器
 *      4.访问 devtools://devtools/bundled/inspector.html?v8only=true&ws=【手机ip】:6086/00010002-0003-4004-8005-000600070008
 *        其中的【手机ip】替换为手机真实ip，如：
 *        devtools://devtools/bundled/inspector.html?v8only=true&ws=192.168.1.219:6086/00010002-0003-4004-8005-000600070008
 */
import XFireApp, { AdCfg, AppBoxAd, AppConfig, BannerAd, FeedsAd, FullscreenAd, InterstitialAd, LoginError, LoginResult, OrderInfo, SdkCfg, SystemInfo, VideoAd } from './xfire_base';

export default class XFireAppAndroid extends XFireApp{

    public constructor() {
        super();
        this.plat = this.PLAT_ANDROID;
        if (cc.sys.platform !== cc.sys.ANDROID) {
            console.error('XFireAppAndroid只可在Android环境下使用');
        }
        else {
            console.log('安卓平台广告sdk：' + this.getAdSdkName());
        }
    }

    public getAdSdkName(): string {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let name: string = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'getAdSdkName', '()Ljava/lang/String;');
        if (name === '') {
            console.error('没有取到ad sdk名称');
        }
        return name;
    }

    public getSubPlat(): string {
        return this.getAdSdkName();
    }

    public setKeepScreenOn(on: boolean) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'keepScreenOn', '(Z)V', on);
    }

    public analyzerSendEvent(eventName: string, eventArg: string) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'sendEvent', '(Ljava/lang/String;Ljava/lang/String;)V', eventName, eventArg == null ? '' : eventArg);
    }

    public analyzerStageEnter(stageId: number, userId?: string) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'stageEnter', '(I)V', stageId);
    }

    public analyzerStageEnd(stageId: number, succ: boolean, score?: number, userId?: string) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'stageEnd', '(IZI)V', stageId, succ, score);
    }

    public openBrowser(url: string) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'openBrowser', '(Ljava/lang/String;)V', url);
    }

    /** 显示隐私策略弹窗 */
    public showPrivacy() {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'showPrivacy', '()V');
    }

    public supportExitCheck(): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'supportExitCheck', '()Z');
    }

    public exitCheck(onCancel: () => void, onConfirm: () => void) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'exitCheck', '(I)V',
            XFireApp.getInstance().createJsbCallBack((params: any) => {
                if (params && params.succ) {
                    if (onConfirm) {
                        onConfirm();
                    }
                }
                else {
                    if (onCancel) {
                        onCancel();
                    }
                }
            })
        );
    }

    public supportBannerAd(): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let support: boolean = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'supportBannerAd', '()Z');
        return support;
    }

    public supportBannerAdMove(): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let support: boolean = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'supportBannerAdMove', '()Z');
        return support;
    }

    public supportVideoAd(): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let support: boolean = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'supportVideoAd', '()Z');
        return support;
    }

    public supportInterstitialAd(): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let support: boolean = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'supportInterstitialAd', '()Z');
        return support;
    }

    public supportAppBoxAd(): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let support: boolean = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'supportAppBoxAd', '()Z');
        return support;
    }

    public supportFullscreenAd(): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let support: boolean = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'supportFullscreenAd', '()Z');
        return support;
    }

    public supportFeedsAd(): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let support: boolean = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'supportFeedsAd', '()Z');
        return support;
    }

    public supportFeedsAdMove(): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let support: boolean = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'supportFeedsAdMove', '()Z');
        return support;
    }

    public supportLogin(): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let support: boolean = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'supportLogin', '()Z');
        return support;
    }

    public supportPayment(): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let support: boolean = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'supportPayment', '()Z');
        return support;
    }

    public login(param: {
        timeout?: number;                       // 超时时间，单位ms
        success?: (res: LoginResult) => void;
        fail?: (err: LoginError) => void;
        complete?: () => void;
    }= {}): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let errMsg = 'login未实现';
        console.error(errMsg);
        if (param.fail) {
            param.fail({msg: errMsg});
        }
        if (param.complete) {
            param.complete();
        }
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return new BannerAdAndroid(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return new VideoAdAndroid(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return new InterstitialAdAndroid(sdkConfig, cfg);
    }

    public createFullscreenAd(sdkConfig: SdkCfg, cfg: AdCfg): FullscreenAd {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return new FullscreenAdAndroid(sdkConfig, cfg);
    }

    public createAppBoxAd(sdkConfig: SdkCfg, cfg: AdCfg): AppBoxAd {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return new AppBoxAdAndroid(sdkConfig, cfg);
    }

    public createFeedsAd(sdkConfig: SdkCfg, cfg: AdCfg): FeedsAd {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return new FeedsAdAndroid(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        // 品牌#$型号#$设备像素比#$屏幕宽#$屏幕高#$窗口宽#$窗口高#$语言
        let info: string = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'getSystemInfo', '()Ljava/lang/String;');
        let infos = info.split('#$');
        return {
            brand: infos[0],
            model: infos[1],
            pixelRatio: parseInt(infos[2], 10),
            screenWidth: parseInt(infos[3], 10),
            screenHeight: parseInt(infos[4], 10),
            windowWidth: parseInt(infos[5], 10),
            windowHeight: parseInt(infos[6], 10),
            language: infos[7]
        };
    }

    public getChannel(): string {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let channel: string = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'getChannel', '()Ljava/lang/String;');
        return channel;
    }

    public supportClipboard(): boolean {
        return true;
    }

    public setClipboardData(content: string): Promise<boolean> {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return new Promise<boolean> ((resolve) => {
            jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
                'setClipboardData',
                '(Ljava/lang/String;)V',
                content
            );
            resolve(true);
        });
    }

    public getClipboardData(): Promise<string> {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return new Promise<string> ((resolve) => {
            let content: string = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'getClipboardData', '()Ljava/lang/String;');
            resolve(content);
        });
    }

    /**
     * 通用的java端方法调用接口
     * @param method 方法名
     * @param params 参数集合
     */
    public remoteCall(method: string, params: {[key: string]: any}): Promise<any> {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return new Promise<any> ((resolve) => {
            jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
                'remoteCall',
                '(Ljava/lang/String;I)V',
                JSON.stringify({method, data: params}),
                XFireApp.getInstance().createJsbCallBack((ret: {result: string; data: any}) => {
                    if (ret != null && ret.result === 'ok') {
                        console.log('android remoteCall succ: ' + method);
                        resolve(ret.data);
                    }
                    else {
                        console.error('android remoteCall fail:' + method);
                        resolve(null);
                    }
                })
            );
        });
    }

    public getIMEI(): string {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'getProperty', '(Ljava/lang/String;)Ljava/lang/String;', 'imei');
    }

    public getIMSI(): string {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'getProperty', '(Ljava/lang/String;)Ljava/lang/String;', 'imsi');
    }

    /** 获取版本号 */
    public getVersionCode(): number {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return parseInt(jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'getProperty', '(Ljava/lang/String;)Ljava/lang/String;', 'versionCode'), 10);
    }

    /** 获取版本名 */
    public getVersionName(): string {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'getProperty', '(Ljava/lang/String;)Ljava/lang/String;', 'versionName');
    }

    /** 获取包名 */
    public getPackageName(): string {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'getProperty', '(Ljava/lang/String;)Ljava/lang/String;', 'packageName');
    }

    /**
     * 弹窗获取用户输入，并不友好，仅用于配合其他功能演示
     * @param title 输入框标题
     */
    public getUserInput(title: string): Promise<string> {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return new Promise<string> ((resolve) => {
            jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
                'getUserInput',
                '(Ljava/lang/String;I)V',
                title,
                XFireApp.getInstance().createJsbCallBack((ret: {succ: boolean; text: string}) => {
                    if (!ret.succ) {
                        resolve(null);
                    }
                    else {
                        resolve(ret.text);
                    }
                })
            );
        });
    }

    /** 判断文件夹是否存在 */
    public isDirectoryExist(path: string): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return false;
        }
        return jsb.fileUtils.isDirectoryExist(path);
    }

    /** 判断文件是否存在 */
    public isFileExist(path: string): boolean {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return false;
        }
        return jsb.fileUtils.isFileExist(path);
    }

    /** 获取存储目录，如：/data/user/0/com.xh.sgtmp.empty/files/ */
    public getWritablePath(): string {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        return jsb.fileUtils.getWritablePath();
    }

    /** 获取外部存储目录，如：/storage/emulated/0/Android/data/com.xh.sgtmp.empty/files */
    public getExternalFilesDir(): string {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let dir: string = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'getExternalFilesDir', '()Ljava/lang/String;');
        return dir;
    }

    /** 安装apk */
    public installApk(apkPath: string): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        if (apkPath == null || apkPath === '') {
            console.log('安装包路径为空');
            return;
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'installApk', '(Ljava/lang/String;)V', apkPath);
    }

    public downloadFile(params: {
        url: string;
        storePath: string;
        success?: (path: string) => void;
        fail?: (failMsg: string) => void;
        onProgress?: (prog0To1: number) => void;
    }) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let downloader = new jsb.Downloader();
        downloader.setOnTaskError((task: jsb.DownloaderTask, errorCode: any, errorCodeInternal: any, errorStr: any) => {
            // console.log(`下载失败:${params.url} 错误：${JSON.stringify(errorStr)}`);
            if (params.fail) {
                params.fail(JSON.stringify(errorStr));
            }
        });
        downloader.setOnFileTaskSuccess((task: jsb.DownloaderTask) => {
            // console.log(`下载成功:${params.url}`);
            if (params.success) {
                params.success(params.storePath);
            }
        });
        downloader.setOnTaskProgress((task: jsb.DownloaderTask, bytesReceived: number, totalBytesReceived: number, totalBytesExpected: number) => {
            let prog = 0;
            if (totalBytesExpected != null) {
                prog = totalBytesReceived / totalBytesExpected;
            }
            if (params.onProgress) {
                params.onProgress(prog);
            }
        });
        downloader.createDownloadFileTask(params.url, params.storePath);
    }

    protected init(config: AppConfig, createAdvertisements = true) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        super.init(config, false);
        let adsdkcfg = this.getSdkConfig();
        if (adsdkcfg == null) {
            console.error('init失败，尚未配置 sdk参数');
            return;
        }
        let info: string = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'waitForInitialized',
            '(I)V',
            XFireApp.getInstance().createJsbCallBack((params: any) => {
                if (params != null && params.succ) {
                    console.log('android init succ');
                    this.createAdvertisements();
                }
                else {
                    console.error('android init fail');
                }
            })
        );
    }

    protected nativePay(payPoint: string, orderId: string) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let payPointCfg = this.getPayPointConfig(payPoint);
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'startPay',
            '(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;IF)V',
            payPoint,
            orderId,
            payPointCfg.id || '',
            payPointCfg.goods || '',
            payPointCfg.count,
            payPointCfg.price);
    }

    protected nativeSetPayNotifier(notifier: {
        success?: (orderInfo: OrderInfo) => void;
        cancel?: (orderInfo: OrderInfo) => void;
        fail?: (orderInfo: OrderInfo, failMsg: string) => void;
    }) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'setPayNotifier',
            '(I)V',
            XFireApp.getInstance().createJsbCallBack((params: {
                status: string/*success fail cancel*/;
                payPoint: string;
                orderid: string;
                failMsg: string;
            }) => {
                if (notifier == null) {
                    return;
                }
                let cfg = this.getPayPointConfig(params.payPoint);
                if (!cfg) {
                    return;
                }
                if (params.status === 'success' && notifier.success) {
                    notifier.success({payPoint: params.payPoint, orderid: params.orderid, count: cfg.count, goodsName: cfg.goods});
                }
                else if (params.status === 'fail' && notifier.fail) {
                    notifier.fail({payPoint: params.payPoint, orderid: params.orderid, count: cfg.count, goodsName: cfg.goods}, params.failMsg);
                }
                else if (params.status === 'cancel' && notifier.cancel) {
                    notifier.cancel({payPoint: params.payPoint, orderid: params.orderid, count: cfg.count, goodsName: cfg.goods});
                }
            }));
    }
}

class BannerAdAndroid extends BannerAd{
    public supportAutoRefresh() {
        return true;
    }

    public onEvent(param: {event: string; succ: boolean; msg: string}) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        switch (param.event) {
            case 'create':
                if (param.succ) {
                    jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'loadBannerAd', '(Ljava/lang/String;)V', this.config.name);
                }
                break;
            case 'load':
                this.enable = param.succ === true;
                break;
            default:
                break;
        }
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let scaleToPlat = xfire.getSystemInfoSync().screenWidth / cc.view.getVisibleSize().width;
        let style = {left: 0, top: 0, width: 0, height: 0};
        // 定义style转换接口
        if (this.config.style) {
            let genBannerAdStyle = (style: {left?: number; top?: number; width?: number; height?: number}): any => {
                return {left: style.left * scaleToPlat, top: style.top * scaleToPlat, width: style.width * scaleToPlat, height: style.height * scaleToPlat};
            };
            style = genBannerAdStyle(this.config.style);
            console.log('xhsg_android create banner' + this.config.name + ' ' + JSON.stringify(style));
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'createBannerAd',
            '(Ljava/lang/String;Ljava/lang/String;IIIII)V',
            this.config.name,
            this.config.id,
            style.left,
            style.top,
            style.width,
            style.height,
            XFireApp.getInstance().createJsbCallBack(this.onEvent.bind(this))
        );
    }

    public moveTo(bottom: number): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let scaleToPlat = xfire.getSystemInfoSync().screenWidth / cc.view.getVisibleSize().width;
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'moveBannerAd',
            '(Ljava/lang/String;I)V',
            this.config.name,
            bottom * scaleToPlat
        );
    }

    public moveToEx(left: number, top: number, width: number, height: number): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let scaleToPlat = xfire.getSystemInfoSync().screenWidth / cc.view.getVisibleSize().width;
        let dstLeft = left * scaleToPlat;
        let dstTop = top * scaleToPlat;
        let dstWidth = width * scaleToPlat;
        let dstHeight = height * scaleToPlat;
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'moveBannerAd',
            '(Ljava/lang/String;IIII)V',
            this.config.name,
            dstLeft,
            dstTop,
            dstWidth,
            dstHeight
        );
    }

    public destroy(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        throw new Error('Method not implemented.');
    }

    protected nativeShow(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        console.log('BannerAdAndroid nativeShow');
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'showBannerAd',
            '(Ljava/lang/String;)V',
            this.config.name
        );
    }
    protected nativeHide(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        console.log('BannerAdAndroid nativeHide');
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'hideBannerAd',
            '(Ljava/lang/String;)V',
            this.config.name
        );
    }
}

class VideoAdAndroid extends VideoAd{
    private end = false;
    private playCb: (end: boolean) => void = null;

    public onEvent(param: {event: string; succ: boolean; msg: string}) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        switch (param.event) {
            case 'create':
                if (param.succ) {
                    jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'loadVideoAd', '(Ljava/lang/String;)V', this.config.name);
                }
                break;
            case 'load':
                this.enable = param.succ === true;
                break;
            case 'complete':
                this.end = true;
                console.log('看完广告');
                break;
            case 'close':
                if (this.playCb) {
                    this.playCb(this.end);
                }
                if (!this.end && param?.msg) {
                    console.log(param.msg);
                }
                console.log('关闭广告');
                cc.game.emit(cc.game.EVENT_SHOW);
                break;
            default:
                break;
        }
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        console.log('VideoAdAndroid load video' + this.config.name);
        let info: string = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'createVideoAd',
            '(Ljava/lang/String;Ljava/lang/String;I)V',
            this.config.name,
            this.config.id,
            XFireApp.getInstance().createJsbCallBack(this.onEvent.bind(this))
        );
    }

    public destroy(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        throw new Error('Method not implemented.');
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        this.end = false;
        this.playCb = cb;
        cc.game.emit(cc.game.EVENT_HIDE);
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'playVideoAd',
            '(Ljava/lang/String;)V',
            this.config.name
        );
    }
}

class InterstitialAdAndroid extends InterstitialAd {
    public onEvent(param: {event: string; succ: boolean; msg: string}) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        switch (param.event) {
            case 'create':
                if (param.succ) {
                    jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'loadInterstitialAd', '(Ljava/lang/String;)V', this.config.name);
                }
                break;
            case 'load':
                this.enable = param.succ === true;
                break;
            default:
                break;
        }
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let info: string = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'createInterstitialAd',
            '(Ljava/lang/String;Ljava/lang/String;I)V',
            this.config.name,
            this.config.id,
            XFireApp.getInstance().createJsbCallBack(this.onEvent.bind(this))
        );
    }

    protected nativeShow(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        console.log('InterstitialAdAndroid nativeShow');
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'showInterstitialAd',
            '(Ljava/lang/String;)V',
            this.config.name
        );
    }
}

class FullscreenAdAndroid extends FullscreenAd {
    public onEvent(param: {event: string; succ: boolean; msg: string}) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        switch (param.event) {
            case 'create':
                if (param.succ) {
                    jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'loadFullscreenAd', '(Ljava/lang/String;)V', this.config.name);
                }
                break;
            case 'load':
                this.enable = param.succ === true;
                break;
            default:
                break;
        }
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let info: string = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'createFullscreenAd',
            '(Ljava/lang/String;Ljava/lang/String;I)V',
            this.config.name,
            this.config.id,
            XFireApp.getInstance().createJsbCallBack(this.onEvent.bind(this))
        );
    }

    protected nativeShow(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        console.log('FullscreenAdAndroid nativeShow');
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'showFullscreenAd',
            '(Ljava/lang/String;)V',
            this.config.name
        );
    }
}

class AppBoxAdAndroid extends AppBoxAd {
    public onEvent(param: {event: string; succ: boolean; msg: string}) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        switch (param.event) {
            case 'create':
                if (param.succ) {
                    jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'loadAppBoxAd', '(Ljava/lang/String;)V', this.config.name);
                }
                break;
            case 'load':
                this.enable = param.succ === true;
                break;
            default:
                break;
        }
    }
    public load(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let info: string = jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'createAppBoxAd',
            '(Ljava/lang/String;Ljava/lang/String;I)V',
            this.config.name,
            this.config.id,
            XFireApp.getInstance().createJsbCallBack(this.onEvent.bind(this))
        );
    }

    protected nativeShow(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'showAppBoxAd',
            '(Ljava/lang/String;)V',
            this.config.name
        );
    }
}

class FeedsAdAndroid extends FeedsAd {
    public onEvent(param: {event: string; succ: boolean; msg: string}) {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        switch (param.event) {
            case 'create':
                if (param.succ) {
                    jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity', 'loadFeedsAd', '(Ljava/lang/String;)V', this.config.name);
                }
                break;
            case 'load':
                this.enable = param.succ === true;
                break;
            default:
                break;
        }
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let scaleToPlat = xfire.getSystemInfoSync().screenWidth / cc.view.getVisibleSize().width;
        let style = this.config.style;
        // 定义style转换接口
        if (style.width === 0 || style.height === 0) {
            style.width = Math.min(cc.winSize.width, cc.winSize.height);
            style.height = style.width * 290 / 350;
            style.left = (cc.winSize.width - style.width) / 2;
            style.top = cc.winSize.height - style.height;
        }
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'createFeedsAd',
            '(Ljava/lang/String;Ljava/lang/String;IIIII)V',
            this.config.name,
            this.config.id,
            style.left * scaleToPlat,
            style.top * scaleToPlat,
            style.width * scaleToPlat,
            style.height * scaleToPlat,
            XFireApp.getInstance().createJsbCallBack(this.onEvent.bind(this))
        );
    }

    public moveTo(left: number, top: number, width: number, height: number): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        let info = xfire.getSystemInfoSync();
        let scale = info.screenWidth / cc.view.getVisibleSize().width;
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'moveFeedsAd',
            '(Ljava/lang/String;IIII)V',
            this.config.name,
            left * scale,
            top * scale,
            width * scale,
            height * scale
        );
    }

    protected nativeShow(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        console.log('FeedsAdAndroid nativeShow');
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'showFeedsAd',
            '(Ljava/lang/String;)V',
            this.config.name
        );
    }

    protected nativeHide(): void {
        if (xfire.plat !== xfire.PLAT_ANDROID) {
            return;
        }
        console.log('FeedsAdAndroid nativeHide');
        jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
            'hideFeedsAd',
            '(Ljava/lang/String;)V',
            this.config.name
        );
    }
}
