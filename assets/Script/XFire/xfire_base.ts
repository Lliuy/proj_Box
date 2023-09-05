import XFireConfigs from './xfire_config';

const LAYER_MONITOR_NAME = 'xfire监听层';

const OffsetsFromUTF8: number[] = [0x00000000, 0x00003080, 0x000E2080, 0x03C82080, 0xFA082080, 0x82082080];
const UNI_MAX_BMP = 0x0000FFFF;
const UNI_MAX_UTF16 = 0x0010FFFF;
const UNI_SUR_HIGH_START = 0xD800;
const UNI_SUR_HIGH_END = 0xDBFF;
const UNI_SUR_LOW_START = 0xDC00;
const UNI_SUR_LOW_END = 0xDFFF;
const HalfShift = 10;
const HalfBase = 0x0010000;
const HalfMask = 0x3FF;
const tbl_TrailingBytesForUTF8: number[] = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5
];

class RemoteImage {
    public fix = false;
    public url = '';
    public loading = false;
    public retried = 0;         // 重试次数
    public loaded = false;
    public frame: cc.SpriteFrame = new cc.SpriteFrame();
}

/** 临时图片缓冲 */
let REMOTE_IMAGE_CACHE_SIZE = 50;
let mapImageCache: { [key: string]: RemoteImage } = {};
let aryImageCache: RemoteImage[] = [];
let cacheResourceImage: { [key: string]: cc.SpriteFrame } = {};
let cacheResourceSpriteAtlas: { [key: string]: cc.SpriteAtlas } = {};

export default class XFireApp {
    private static instance: XFireApp = null;
    public static getInstance(): XFireApp {
        return XFireApp.instance;
    }

    public plat = '';
    public PLAT_QQ = 'qq';
    public PLAT_WECHAT = 'wechat';
    public PLAT_VIVO = 'vivo';
    public PLAT_OPPO = 'oppo';
    public PLAT_BAIDU = 'baidu';
    public PLAT_ANDROID = 'android';
    public PLAT_DESKTOP_BROWSER = 'desktop_browser';
    public PLAT_MOBILE_BROWSER = 'mobile_browser';
    public PLAT_BYTEDANCE = 'bytedance';
    public PLAT_KAIXIN = 'kaixin';
    public PLAT_MEIZU = 'meizu';
    public PLAT_XIAOMI = 'xiaomi';
    public PLAT_QUTOUTIAO = 'qutoutiao';
    public PLAT_UC = 'uc';
    public PLAT_HUAWEI = 'huawei';
    public PLAT_QIHU = 'qihu';
    public PLAT_SNOWFISH = 'snowfish';
    public PLAT_JKW = 'jkw';
    public PLAT_KUAISHOU = 'kuaishou';
    public PLAT_LINKSURE = 'linksure';
    public PLAT_KUAIKAN = 'kuaikan';
    public PLAT_SNOWFLAKE = 'snowflake';
    public PLAT_4399 = '4399';
    public PLAT_KUGOU = 'kugou';

    public SCOPE_USERINFO = 'scope.userInfo';
    public SCOPE_USERLOCATION = 'scope.userLocation';
    public SCOPE_WRITEPHOTOSALBUM = 'scope.writePhotosAlbum';
    public SCOPE_RECORD = 'scope.record';
    public SCOPE_CAMERA = 'scope.camera';

    public userid = '';         // 不一定有
    public userSession = '';    // 不一定有
    public appConfig: AppConfig = null;
    public advertisements: { [key: string]: Ad } = {};
    /** 本次游戏启动后的游戏时间，单位：秒 */
    public get gameTime(): number {
        return this._gameTime;
    }
    public get idleTime(): number {
        return this._gameTime - this.lastTouchTimestamp;
    }
    public eventCenter: cc.EventTarget = new cc.EventTarget();

    protected session: string = null;
    protected uniqueJsbCallBackId = 1;
    protected jsbCallBacks: { [key: string]: (params?: any) => void } = {};

    protected supportGuestLogin = true;
    protected logined = false;  // 表示用户是否已经登录平台账号

    protected onHideListeners: (() => void)[] = [];
    protected nativeOnHideListener: () => void = null;
    protected videoAdPlaying = false;
    protected videoAdLastPlayTime = 0;

    protected onShowListeners: ((options?: LaunchOptions) => void)[] = [];
    protected nativeOnShowListener: (options?: LaunchOptions) => void = null;

    protected payNotifier: { success?: (orderInfo: OrderInfo) => void; cancel?: (orderInfo: OrderInfo) => void; fail?: (orderInfo: OrderInfo, failMsg: string) => void } = null;
    protected accCbs: ((res: {x: number; y: number; z: number; normalized: boolean}) => void)[] = [];

    private lastTouchTimestamp = 0;
    private layerMonitor: cc.Node = null;

    private payCount = 0;

    private pressedKeys: { [key: number]: boolean } = {};
    private configsInitialized = false;
    // 游戏时间
    private _gameTime = 0;

    public constructor() {
        XFireApp.instance = this;
        (window as any).xfire = this;
        // 监听层处理
        this.schedule(() => {
            // 初创场景
            if (this.layerMonitor == null && cc.director.getScene() != null) {
                this.createLayerMonitor();
            }

            // 处理广告刷新
            let idleTime = (this.gameTime - this.lastTouchTimestamp);
            for (let key in this.advertisements) {
                if (!this.advertisements.hasOwnProperty(key)) {
                    continue;
                }
                let ad = this.advertisements[key];
                if (ad == null) {
                    continue;
                }
                ad.update(XFireConfigs.监听层刷新周期 / 1000, idleTime);
            }
        }, XFireConfigs.监听层刷新周期);
    }

    /**
     * 子平台，安卓返回sdk名，其他同xfire.plat
     */
    public getSubPlat(): string {
        return xfire.plat;
    }

    /**
     * 渠道，安卓返回渠道名，其他默认default
     */
    public getChannel(): string {
        return 'default';
    }

    public getAdSdkName(): string {
        return '';
    }

    public supportExitCheck(): boolean {
        return false;
    }

    /**
     * 退出确认，有些安卓平台需要在封面用户按返回键的情况下调用平台退出确认接口，
     * 会打个广告啥的。
     * @param onCancel 取消回调
     * @param onConfirm 确认退出，不一定收到，可能直接杀进程退出游戏了
     */
    public exitCheck(onCancel: () => void, onConfirm: () => void) {
        setTimeout(() => {
            if (onCancel) {
                onCancel();
            }
        }, 0);
    }

    /**
     * 判断是否支持振动
     */
    public supportVibrate(): boolean {
        return false;
    }

    /**
     * 短振动，平台不同振动时间略有差异
     */
    public vibrateShort() {

    }

    /**
     * 长振动，平台不同振动时间略有差异
     */
    public vibrateLong() {

    }

    /**
     * 分包加载，加载完成前不可以加载分包中的资源
     * @param onProgressUpdate 进度回调，从0-1
     * @example <caption>loading场景中加载分包</caption>
     * public onLoad () {
     *     xfire.initWithConfigs(this.xhAppCfg.json);
     * }
     *
     * public start () {
     *     (async () => {
     *         await xfire.loadSubpackages((prog) => {});
     *         this.loadResources();
     *     })();
     * }
     * 这里没有更新ui进度，实际使用需呈现进度给用户
     */
    public loadSubpackages(onProgressUpdate?: (progress: number) => void): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            if (onProgressUpdate != null) {
                onProgressUpdate(1);
            }
            resolve(true);
        });
    }

    /**
     * 获取当前时间戳，单位：毫秒
     */
    public get currentTimeMillis(): number {
        // 使用Date.now性能更优秀点，保留另一种方式做参考。
        // return new Date().getTime();
        return Date.now();
    }

    /**
     * 获取当前时区
     */
    public get currentTimeZone(): TimeZone {
        return -(new Date().getTimezoneOffset()) / 60;
    }

    /**
     * 计算两个时间戳间隔多少天，返回【end日期 - start日期】
     * 时区默认为系统时区
     * 【注意】时区不同结果可能不同，如涉及国外需注意、
     * 如时间戳1585324740000与1585324860000在北京时间里分别对应2020-03-27 23:59与2020-03-28 00:01，相隔1天
     * 但在东京时间里却是同一天
     * @param start 起始时间戳
     * @param end 结束时间戳
     * @param zone 时区
     */
    public getDateDiff(start: number | Date, end: number | Date, zone?: TimeZone) {
        let tsStart = (typeof start === 'number') ? start as number : (start as Date).getTime();
        let tsEnd = (typeof end === 'number') ? end as number : (end as Date).getTime();

        let now = new Date();
        let zoneOff = zone == null ? now.getTimezoneOffset() : (-zone * 60);
        tsStart = tsStart - zoneOff * 60000;
        tsEnd = tsEnd - zoneOff * 60000;
        let dayTick = 24 * 3600 * 1000;
        let startDay = Math.floor(tsStart / dayTick);
        let endDay = Math.floor(tsEnd / dayTick);
        return endDay - startDay;
    }

    /**
     * 计算时间戳在指定时区的本地时间
     * @param timestamp 时间戳
     * @param zone 时区
     */
    public getNormalDate(timestamp: number, zone?: TimeZone): NormalDate {
        let now = new Date();
        let lZone = zone || (-now.getTimezoneOffset() / 60);
        now = new Date(timestamp + 3600000 * lZone);
        let day = now.getUTCDay();
        return {
            year: now.getUTCFullYear(),
            month: now.getUTCMonth() + 1,
            date: now.getUTCDate(),
            day: day === 0 ? 6 : (day - 1),
            hours: now.getUTCHours(),
            minutes: now.getUTCMinutes(),
            seconds: now.getUTCSeconds(),
            milliseconds: now.getUTCMilliseconds(),
            timestamp,
            zone: lZone
        };
    }

    /**
     * 判断是否支持放置快捷方式到用户桌面。
     * 有些小游戏平台在安卓手机上支持在用户桌面放置快捷方式。
     */
    public supportShortcut(): boolean {
        return false;
    }

    /**
     * 返回是否安装成功
     * promise没有返回错误信息？考虑非关键接口简洁性
     */
    public installShortcut(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            resolve(false);
        });
    }

    /**
     * 返回是否已经安装快捷方式。
     * promise没有返回错误信息？考虑非关键接口简洁性
     */
    public hasShortcutInstalled(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            resolve(false);
        });
    }

    /**
     * 判断平台是否支持跳转其他小程序。
     */
    public supportMiniProgramNavigate(): boolean {
        return false;
    }

    /**
     * 判断是否配置有指定小程序的跳转信息。
     * @param name 小程序名
     */
    public isNavigateAppEnabled(name: string): boolean {
        let app = this.getNavigateAppConfig(name);
        return app != null && app.enable;
    }

    /**
     * 跳转到其他小程序。
     * @param nameOrParams 小程序名或更详细的参数
     */
    public navigateToMiniProgram(nameOrParams: string | {
        name: string;
        path?: string;
        extraData?: any;
        success?: () => void;
        fail?: () => void;
        complete?: () => void;
    }) {
        let errMsg = 'navigateToMiniProgram未实现';
        console.error(errMsg);
        if (typeof nameOrParams === 'object') {
            if (nameOrParams.fail) {
                nameOrParams.fail();
            }
            if (nameOrParams.complete) {
                nameOrParams.complete();
            }
        }
    }

    /**
     * 获取配置文件中配置的当前小程序跳转列表。
     * @param justEnabled 只返回标记为enabled小程序。
     */
    public getNavigateAppNameList(justEnabled = true): string[] {
        let ret: string[] = [];
        let sdkConfig = this.getSdkConfig();
        if (sdkConfig == null || sdkConfig.navigateApps == null) {
            console.log('未配置跳转列表');
            return ret;
        }
        for (let app of sdkConfig.navigateApps) {
            if (app.enable !== true && justEnabled) {
                continue;
            }
            ret.push(app.name);
        }
        return ret;
    }

    public getNavigateAppCustomData(name: string): { [key: string]: any } {
        let app = this.getNavigateAppConfig(name);
        if (app == null) {
            return {};
        }

        if (app.custom != null && typeof app.custom !== 'object') {
            console.error('自定义数据类型不对');
            return {};
        }
        return app.custom || {};
    }

    /**
     * 判断平台是否支持创建用户授权按钮
     */
    public supportUserInfoButton(): boolean {
        return false;
    }

    /**
     * 创建平台的用户授权按钮
     * @param spaceNode 要锚定位置的结点
     * @param left 相对于锚定结点坐标原点
     * @param top 相对于锚定结点坐标原点
     * @param width 宽，单位：游戏像素
     * @param height 高，单位：游戏像素
     * @param imagePath 为空则创建透明按钮
     */
    public createUserInfoButton(spaceNode: cc.Node, left: number, top: number, width: number, height: number, imagePath: string = null): XUserInfoButton {
        return null;
    }

    /** 判断平台是否支持创建意见反馈按钮 */
    public supportFeedbackButton(): boolean {
        return false;
    }

    /**
     * 创建平台的意见反馈按钮
     * @param spaceNode 要锚定位置的结点
     * @param left 相对于锚定结点坐标原点
     * @param top 相对于锚定结点坐标原点
     * @param width 宽，单位：游戏像素
     * @param height 高，单位：游戏像素
     * @param imagePath 为空则创建透明按钮
     */
    public createFeedbackButton(spaceNode: cc.Node, left: number, top: number, width: number, height: number, imagePath: string = null): XFeedbackButton {
        return null;
    }

    /** 判断平台是否支持录屏 */
    public supportRecord(): boolean {
        return false;
    }

    /** 判断平台是否支持banner广告 */
    public supportBannerAd(): boolean {
        return true;
    }

    /** 判断平台是否支持banner移动 */
    public supportBannerAdMove(): boolean {
        return false;
    }

    /** 判断平台是否支持激励视频广告 */
    public supportVideoAd(): boolean {
        return true;
    }

    /** 判断平台是否支持插屏广告 */
    public supportInterstitialAd(): boolean {
        return false;
    }

    /** 判断平台是否支持格子广告 */
    public supportGridAd(): boolean {
        return false;
    }

    /** 判断平台是否支持盒子广告 */
    public supportAppBoxAd(): boolean {
        return false;
    }

    /** 判断平台是否支持全屏插屏 */
    public supportFullscreenAd(): boolean {
        return false;
    }

    /** 判断平台是否支持信息流广告 */
    public supportFeedsAd(): boolean {
        return false;
    }

    /** 判断平台是否支持feeds移动 */
    public supportFeedsAdMove(): boolean {
        return false;
    }

    /** 判断平台是否支持积木广告 */
    public supportBlockAd(): boolean {
        return false;
    }

    /** 玩家已登录时，单机游戏存档是否必须存到服务器 */
    public mustArchiveOnline(): boolean {
        return false;
    }

    /** 判断平台是否允许自动登录，有些平台不允许暗戳戳的发起登录，必须用户点击 */
    public supportAutoLogin(): boolean {
        return this.supportLogin();
    }

    /**
     * 不要再直接使用本接口，应使用Analyzer模块
     * 平台自身统计接口：事件统计
     * @param eventName 事件名称
     * @param eventArg 事件参数
     */
    public analyzerSendEvent(eventName: string, eventArg: string) {
    }

    /**
     * 不要再直接使用本接口，应使用Analyzer模块
     * 平台自身统计接口：关卡开始
     * @param stageId 关卡id
     * @param userId 可选，用户id
     */
    public analyzerStageEnter(stageId: number, userId?: string) {
    }

    /**
     * 不要再直接使用本接口，应使用Analyzer模块
     * 平台自身统计接口：关卡结束
     * @param stageId 关卡id
     * @param succ true表通关，失败、中途退出传false
     * @param score 可选，获得分数
     * @param userId 可选，用户id
     */
    public analyzerStageEnd(stageId: number, succ: boolean, score?: number, userId?: string) {
    }

    /**
     * 判断平台是否支持支付
     */
    public supportPayment(): boolean {
        return false;
    }

    /**
     * 判断平台是否支持加速度监听
     */
    public supportAccelerometer(): boolean {
        return false;
    }

    /** 开启加速度监听，不会清理已注册加速度监听函数 */
    public startAccelerometer() {
    }

    /** 关闭加速度监听，不会清理已注册加速度监听函数 */
    public stopAccelerometer() {
    }

    /**
     * 监听，回调函数中的参数normlized表示向量是否标准化
     * @param cb 加速度单位为g 9.80665，关于方向：面向手机正面，右x正，上y正，屏幕朝向z正
     */
    public onAccelerometerChange(cb: (res: {x: number; y: number; z: number; normalized: boolean}) => void) {
        if (cb != null) {
            this.accCbs.push(cb);
        }
    }

    /**
     * 取消监听加速度数据
     * @param cb 为空将清除所有监听
     */
    public offAccelerometerChange(cb: (res: {x: number; y: number; z: number}) => void) {
        if (cb == null) {
            this.accCbs = [];
        }
        else {
            let index = this.accCbs.indexOf(cb);
            if (index >= 0) {
                this.accCbs.splice(index, 1);
            }
        }
    }

    /**
     * 发起支付
     * @param payPoint 配置文件中配置的计费点名称
     */
    public startPayPoint(payPoint: string) {
        let sdkcfg = this.getSdkConfig();
        if (sdkcfg == null) {
            console.log('尚未配置sdk：' + this.getAdSdkName());
            return;
        }
        if (sdkcfg.payPoints == null) {
            console.log('SDK配置中没有具体的计费点:' + payPoint);
            return;
        }

        for (let cfg of sdkcfg.payPoints) {
            if (cfg.name === payPoint) {
                this.startPay(cfg.goods, cfg.count, cfg.price, cfg.id);
                return;
            }
        }
        console.log('SDK配置中没有具体的计费点:' + payPoint);
    }

    /**
     * 开始支付，结果通过setPayNotifier设定的回调函数接收
     * @param goodsName 商品名，不要带数量
     * @param count 商品数量，整数
     * @param price 价格，浮点数，单位：元
     * 返回订单号
     */
    public startPay(goodsName: string, count: number, price: number, goodsId?: string): string {
        this.payCount++;
        let date = new Date();
        let orderId = '' + this.formatDate('yyyyMMddHHmmss', date) + this.padStart(this.payCount.toString(), 3, '0');
        orderId += this.padStart(this.getRandomInteger(0, 1000).toString(), 3, '0');
        console.log(orderId);
        setTimeout(() => {
            this.nativePay(orderId, goodsName, count, price, goodsId);
        }, 0);
        return orderId;
    }

    /**
     * 全局监听支付结果，进行发放物品
     * @param notifier 支付结果通知器
     */
    public setPayNotifier(notifier: {
        success?: (orderInfo: OrderInfo) => void;
        cancel?: (orderInfo: OrderInfo) => void;
        fail?: (orderInfo: OrderInfo, failMsg: string) => void;
    }) {
        this.payNotifier = notifier;
        this.nativeSetPayNotifier({
            success: (orderInfo: OrderInfo) => {
                if (this.payNotifier.success) {
                    this.payNotifier.success(orderInfo);
                }
            },
            cancel: (orderInfo: OrderInfo) => {
                if (this.payNotifier.cancel) {
                    this.payNotifier.cancel(orderInfo);
                }
            },
            fail: (orderInfo: OrderInfo, failMsg: string) => {
                if (this.payNotifier.fail) {
                    this.payNotifier.fail(orderInfo, failMsg);
                }
            }
        });
    }

    /**
     * 获取计费点价格，单位：元
     * @param payPoint 计费点名称
     */
    public getPayPointPrice(payPoint: string): number {
        return 0;
    }

    /**
     * 开始录屏
     * @param duration 时长，单位秒，如果时间到了会自动停止
     * @param onEnd 自动停止时会触发，如果使用endRecord主动停止并没有再传回调也会触发本回调
     */
    public startRecord(duration: number, onEnd: (videoPath: string, length: number) => void) {
    }

    /**
     * 主动停止录屏
     * @param onEnd 结束回调，如果非null，那么startRecord中传的将失效，如果为null则回调startRecord传的onEnd
     */
    public endRecord(onEnd?: (videoPath: string, length: number) => void) {
    }

    /**
     * 判断是否正在录像
     */
    public isRecording(): boolean {
        return false;
    }

    /**
     * 分享录像
     * @param videoPath 录像地址
     * @param title 标题
     */
    public shareVideo(params: string | {
        title?: string;
        videoPath?: string;
        success?: () => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }) {
        if (typeof params === 'object') {
            setTimeout(() => {
                if (params.fail) {
                    params.fail('平台不支持视频分享');
                }
                if (params.complete) {
                    params.complete();
                }
            }, 0);
        }
    }

    /**
     * 获取平台的一些设置，主要是用户授权信息
     * @param params 回调接口
     */
    public getSetting(params: {
        success?: (authSetting: { [key: string]: boolean }) => void;
        fail?: (err) => void;
        complete?: () => void;
    }): Promise<{
        authSetting?: { [key: string]: boolean };
        error?: string;
    }> {
        return new Promise<{
            authSetting?: { [key: string]: boolean };
            error?: string;
        }>((resolve) => {
            let lParams = params || {};
            if (lParams.fail) {
                lParams.fail('未实现getSetting');
            }
            if (lParams.complete) {
                lParams.complete();
            }
            resolve({ error: '未实现getSetting' });
        });
    }

    public getUserInfo(params?: {
        success?: (userInfo: XUserInfoWithSignature) => void;
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
            let lParams = params || {};
            let error = '未实现getUserInfo';
            if (lParams.fail) {
                lParams.fail(error);
            }
            if (lParams.complete) {
                lParams.complete();
            }
            resolve({ error });
        });
    }

    /**
     * 传入配置文件信息进行初始化。
     * 为啥不改成自动加载配置？避免异步先后带来的意外，能确保场景加载时配置也加载了。
     * @param config 配置信息
     */
    public initWithConfigs(config: AppConfig) {
        // 防止反复初始化
        if (this.configsInitialized) {
            return;
        }
        this.configsInitialized = true;
        if (config && config.version) {
            console.log('内容版本：' + config.version);
        }
        this.init(config);

        setTimeout(() => {
            if (this.layerMonitor == null) {
                this.createLayerMonitor();
            }
        }, 0);
    }

    public createJsbCallBack(cb: (params?: any) => void): number {
        let ret = this.uniqueJsbCallBackId++;
        if (cb != null) {
            this.jsbCallBacks[ret] = cb;
        }
        return ret;
    }

    public jsbCall(jsbCallBackId: number, params?: any) {
        let cb = this.jsbCallBacks[jsbCallBackId];
        if (cb != null) {
            cb(params);
        }
    }

    /**
     * 标记平台用户是否有游客
     * 如微信、qq是没有游客的，必然是账号登录的
     * 而百度等是可以游客登录的
     */
    public allowGuest(): boolean {
        if (!this.supportGuestLogin) {
            return false;
        }
        return this.getSdkConfig() && this.getSdkConfig().allowGuest === true;
    }

    public supportLogin(): boolean {
        return false;
    }

    // 判断平台账号是否已经登录、登录过
    public platLogined(): boolean {
        if (this.logined) {
            return true;
        }
        return cc.sys.localStorage.getItem(XFireConfigs.平台账号登录标记) === 'true';
    }

    public login(param: {
        timeout?: number;                       // 超时时间，单位ms
        success?: (res: LoginResult) => void;
        fail?: (err: LoginError) => void;
        complete?: () => void;
    } = {}): void {
        let errMsg = 'login未实现';
        if (param.fail) {
            param.fail({ msg: errMsg });
        }
        if (param.complete) {
            param.complete();
        }
    }

    public getAppConfig(): AppConfig {
        return this.appConfig;
    }

    public getSdkConfig(): SdkCfg {
        let name = this.getAdSdkName();
        if (this.appConfig == null) {
            console.log('appConfig未初始化');
            return null;
        }
        for (let cfg of this.appConfig.sdks) {
            if (cfg.name === name) {
                if (cfg.adValidIdleTimeRange == null) {
                    cfg.adValidIdleTimeRange = this.appConfig.adValidIdleTimeRange || XFireConfigs.广告自动刷新有效计时限制;
                }
                if (cfg.adIdleTimeToRefresh == null) {
                    cfg.adIdleTimeToRefresh = this.appConfig.adIdleTimeToRefresh || XFireConfigs.广告自动刷新闲置时间限制;
                }
                return cfg;
            }
        }
        return null;
    }

    public onShow(cb: (options?: LaunchOptions) => void) {
        if (this.nativeOnShowListener == null) {
            this.nativeOnShowListener = (options?: LaunchOptions) => {
                let cbs: ((options?: LaunchOptions) => void)[] = [];
                for (let cb of this.onShowListeners) {
                    cbs.push(cb);
                }
                for (let cb of cbs) {
                    cb(options);
                }
            };
            this.nativeOnShow(this.nativeOnShowListener);
        }
        if (this.onShowListeners.indexOf(cb) >= 0) {
            console.log('onShow回调已存在');
            return;
        }
        this.onShowListeners.push(cb);
    }

    public offShow(cb: (options?: LaunchOptions) => void) {
        let index = this.onShowListeners.indexOf(cb);
        if (index === -1) {
            console.log('offShow：回调并不存在');
            return;
        }
        this.onShowListeners.splice(index, 1);
    }

    public onHide(cb: () => void) {
        if (this.nativeOnHideListener == null) {
            this.nativeOnHideListener = () => {
                let cbs: (() => void)[] = [];
                for (let cb of this.onHideListeners) {
                    cbs.push(cb);
                }
                for (let cb of cbs) {
                    cb();
                }
            };
            this.nativeOnHide(this.nativeOnHideListener);
        }
        if (this.onHideListeners.indexOf(cb) >= 0) {
            console.log('onHide回调已存在');
            return;
        }
        this.onHideListeners.push(cb);
    }

    public offHide(cb: () => void) {
        let index = this.onHideListeners.indexOf(cb);
        if (index === -1) {
            console.log('offHide：回调并不存在');
            return;
        }
        this.onHideListeners.splice(index, 1);
    }

    public exit() {
        cc.game.end();
    }

    public setKeepScreenOn(on: boolean) {
        let errMsg = 'setKeepScreenOn未实现';
        console.error(errMsg);
    }

    public supportShare(): boolean {
        return false;
    }

    public showShareMenu(): void {
        let errMsg = 'showShareMenu未实现';
        console.error(errMsg);
    }

    public hideShareMenu(): void {
        let errMsg = 'hideShareMenu未实现';
        console.error(errMsg);
    }

    public shareAppMessage(shareInfo: {
        title?: string;
        imageUrl?: string;
        query?: string;
        success?: () => void;
        fail?: () => void;
        complete?: () => void;
    }): void {
        let errMsg = 'shareAppMessage未实现';
        console.error(errMsg);
        if (shareInfo == null) {
            return;
        }

        setTimeout(() => {
            if (shareInfo.fail) {
                shareInfo.fail();
            }
            if (shareInfo.complete) {
                shareInfo.complete();
            }
        }, 0);
    }

    public onShareAppMessage(cb: () => ShareInfo): void {
        let errMsg = 'onShareAppMessage未实现';
        console.error(errMsg);
    }

    public offShareAppMessage(cb: () => ShareInfo): void {
        let errMsg = 'offShareAppMessage未实现';
        console.error(errMsg);
    }

    public getLaunchOptionsSync(): LaunchOptions {
        let errMsg = 'getLaunchOptionsSync未实现';
        console.log(errMsg);
        return;
    }

    public isAdReady(name: string): boolean {
        let ad: Ad = this.getAd(name);
        return ad != null && ad.isReady();
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        return null;
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        return null;
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        return null;
    }

    public createGridAd(sdkConfig: SdkCfg, cfg: AdCfg): GridAd {
        return null;
    }

    public createAppBoxAd(sdkConfig: SdkCfg, cfg: AdCfg): AppBoxAd {
        return null;
    }

    public createFullscreenAd(sdkConfig: SdkCfg, cfg: AdCfg): FullscreenAd {
        return null;
    }

    public createFeedsAd(sdkConfig: SdkCfg, cfg: AdCfg): FeedsAd {
        return null;
    }

    public createBlockAd(sdkConfig: SdkCfg, cfg: AdCfg): BlockAd {
        return null;
    }

    public getBannerSize(name: string): { width: number; height: number } {
        let ad: Ad = this.getAd(name, true, 'banner');
        if (ad == null) {
            console.log('banner广告不存在: ' + name);
            return { width: 0, height: 0 };
        }
        let banner = ad as BannerAd;
        return banner.size;
    }

    public moveBannerTo(name: string, bottom: number) {
        let ad: Ad = this.getAd(name, true, 'banner');
        if (ad == null) {
            console.log('banner广告不存在: ' + name);
            return;
        }
        let banner = ad as BannerAd;
        banner.moveTo(bottom);
    }

    public moveBannerToEx(name: string, left: number, top: number, width: number, height: number) {
        let ad: Ad = this.getAd(name, true, 'banner');
        if (ad == null) {
            console.log('banner广告不存在: ' + name);
            return;
        }
        let banner = ad as BannerAd;
        banner.moveToEx(left, top, width, height);
    }

    public getGridAdSize(name: string): { width: number; height: number } {
        let ad: Ad = this.getAd(name, true, 'grid');
        if (ad == null) {
            console.log('grid广告不存在: ' + name);
            return { width: 0, height: 0 };
        }
        let gad = ad as GridAd;
        return gad.size;
    }

    public moveGridAdTo(name: string, bottom: number) {
        let ad: Ad = this.getAd(name, true, 'grid');
        if (ad == null) {
            console.log('grid广告不存在: ' + name);
            return;
        }
        let gad = ad as GridAd;
        gad.moveTo(bottom);
    }

    public showBanner(name: string): void {
        let ad: Ad = this.getAd(name, true, 'banner');
        if (ad == null) {
            console.log('banner广告不存在: ' + name);
            return;
        }
        let banner = ad as BannerAd;
        banner.dstVisible = true;
        BannerAd.needToRefreshBanners = true;
        setTimeout(() => {
            BannerAd.refreshBanners();
        }, 0);
    }

    public hideBanner(name: string): void {
        let ad: Ad = this.getAd(name, true, 'banner');
        if (ad == null) {
            console.log('banner广告不存在: ' + name);
            return;
        }
        let banner = ad as BannerAd;
        banner.dstVisible = false;
        BannerAd.needToRefreshBanners = true;
        setTimeout(() => {
            BannerAd.refreshBanners();
        }, 0);
    }

    public isVideoAdPlaying(): boolean {
        if (!this.videoAdPlaying || (!cc.game.isPaused() && (xfire.currentTimeMillis - this.videoAdLastPlayTime) > 2000)) {
            return false;
        }
        return true;
    }

    public playVideo(name: string, cb: (end: boolean, error: boolean) => void): void {
        if (this.videoAdPlaying) {
            console.log('有视频广告未播放结束');
            setTimeout(() => {
                if (cb) {
                    cb(false, true);
                }
            }, 0);
            return;
        }
        let ad: Ad = this.getAd(name, true, 'video');
        if (ad == null) {
            console.log('视频广告不存在: ' + name);
            setTimeout(() => {
                if (cb) {
                    cb(false, true);
                }
            }, 0);
            return;
        }
        if (!ad.isReady()) {
            console.log('视频广告未就绪：' + name);
            setTimeout(() => {
                if (cb) {
                    cb(false, true);
                }
            }, 0);
            return;
        }
        this.videoAdPlaying = true;
        this.videoAdLastPlayTime = xfire.currentTimeMillis;
        let video = ad as VideoAd;
        video.play((end: boolean) => {
            this.videoAdPlaying = false;
            if (cb) {
                setTimeout(() => {
                    cb(end, false);
                }, 0);
            }
        });
    }

    public showInterstitialAd(name: string): void {
        let ad: Ad = this.getAd(name, true, 'interstitial');
        if (ad == null) {
            console.log('插屏广告不存在: ' + name);
            return;
        }
        if (!ad.isReady()) {
            console.log('插屏广告未就绪：' + name);
            return;
        }
        let iad = ad as InterstitialAd;
        iad.show();
    }

    public showGridAd(name: string): void {
        let ad: Ad = this.getAd(name, true, 'grid');
        if (ad == null) {
            console.log('格子广告不存在：' + name);
            return;
        }
        if (!ad.isReady()) {
            console.log('格子广告未就绪：' + name);
            return;
        }
        let gad = ad as GridAd;
        gad.show();
    }

    public hideGridAd(name: string): void {
        let ad: Ad = this.getAd(name, true, 'grid');
        if (ad == null) {
            console.log('格子广告不存在：' + name);
            return;
        }
        let gad = ad as GridAd;
        gad.hide();
    }

    public showAppBox(name: string): void {
        let ad: Ad = this.getAd(name, true, 'box');
        if (ad == null) {
            console.log('盒子广告不存在：' + name);
            return;
        }
        let box = ad as AppBoxAd;
        box.show();
    }

    public showFullscreenAd(name: string): void {
        let ad: Ad = this.getAd(name, true, 'fullscreen');
        if (ad == null) {
            console.log('全屏广告不存在: ' + name);
            return;
        }
        if (!ad.isReady()) {
            console.log('全屏广告未就绪：' + name);
            return;
        }
        let iad = ad as FullscreenAd;
        iad.show();
    }

    public showFeedsAd(name: string): void {
        let ad: Ad = this.getAd(name, true, 'feeds');
        if (ad == null) {
            console.log('信息流广告不存在: ' + name);
            return;
        }
        if (!ad.isReady()) {
            console.log('信息流广告未就绪：' + name);
            return;
        }
        let iad = ad as FeedsAd;
        iad.show();
    }

    public hideFeedsAd(name: string): void {
        let ad: Ad = this.getAd(name, true, 'feeds');
        if (ad == null) {
            console.log('信息流广告不存在: ' + name);
            return;
        }
        let iad = ad as FeedsAd;
        iad.hide();
    }

    public moveFeeds(name: string, left: number, top: number, width: number, height: number) {
        if (!this.supportFeedsAdMove()) {
            return;
        }
        let ad: Ad = this.getAd(name, true, 'feeds');
        if (ad == null) {
            console.log('信息流广告不存在: ' + name);
            return;
        }
        let feeds = ad as FeedsAd;
        feeds.moveTo(left, top, width, height);
    }

    public showBlockAd(name: string): void {
        let ad: Ad = this.getAd(name, true, 'block');
        if (ad == null) {
            console.log('积木广告不存在: ' + name);
            return;
        }
        let iad = ad as BlockAd;
        iad.show();
    }

    public hideBlockAd(name: string): void {
        let ad: Ad = this.getAd(name, true, 'block');
        if (ad == null) {
            console.log('积木广告不存在: ' + name);
            return;
        }
        let iad = ad as BlockAd;
        iad.hide();
    }

    public moveBlock(name: string, left: number, top: number) {
        if (!this.supportBlockAd()) {
            return;
        }
        let ad: Ad = this.getAd(name, true, 'block');
        if (ad == null) {
            console.log('积木广告不存在: ' + name);
            return;
        }
        let blockAd = ad as BlockAd;
        blockAd.moveTo(left, top);
    }

    public getSystemInfoSync(): SystemInfo {
        let errMsg = 'getSystemInfoSync未实现';
        console.error(errMsg);
        return;
    }

    public update(dtSecond: number, idleTimeSecond: number) {
        // this.idleTime = idleTimeSecond;
    }

    /**
     * 设置远程图片缓存大小
     * @param size 缓存大小
     */
    public setRemoteImageCacheSize(size: number) {
        REMOTE_IMAGE_CACHE_SIZE = Math.max(XFireConfigs.远程图片缓存大小, size);
    }

    /**
     * 加载远程图片
     * @param url 图片地址
     * @param incFix 是否固化在缓存里
     */
    public loadRemoteImage(url: string, fix = false): cc.SpriteFrame {
        if (url == null || url === '') {
            return;
        }
        let remoteImage = mapImageCache[url];
        if (remoteImage == null) {
            remoteImage = new RemoteImage();
            remoteImage.url = url;
            mapImageCache[url] = remoteImage;
            aryImageCache.push(remoteImage);
            if (aryImageCache.length > REMOTE_IMAGE_CACHE_SIZE) {
                for (let img of aryImageCache) {
                    if (img.fix) {
                        continue;
                    }
                    this.releaseRemoteImage(img.url);
                    break;
                }
            }
        }
        else {
            let index = aryImageCache.indexOf(remoteImage);
            if (index >= 0) {
                aryImageCache.splice(index, 1);
                aryImageCache.push(remoteImage);
            }
        }
        if (fix === true) {
            remoteImage.fix = true;
        }
        // 如果retried次数到了还没加载成功，但又调用了一次loadRemoteImage，那么会进行一次加载
        if (!remoteImage.loaded && !remoteImage.loading) {
            remoteImage.loading = true;
            let load = () => {
                cc.loader.load({ url: remoteImage.url, type: 'jpg' }, (err, tex) => {
                    if (tex instanceof cc.Texture2D && err == null) {
                        if (!remoteImage.loading || remoteImage.loaded) {
                            cc.loader.release(url);
                        }
                        else {
                            remoteImage.frame.setTexture(tex);
                            remoteImage.loaded = true;
                            remoteImage.loading = false;
                        }
                    }
                    else if (remoteImage.loading) {   // 5秒后重试
                        if (remoteImage.retried < XFireConfigs.远程图片加载重试次数) {
                            this.schedule(() => {
                                if (!remoteImage.loaded) {
                                    remoteImage.retried++;
                                    if (remoteImage.retried >= XFireConfigs.远程图片加载重试次数) {
                                        remoteImage.loading = false;
                                    }
                                    load();
                                }
                            }, XFireConfigs.远程图片加载重试间隔 * 1000, 1);
                        }
                    }
                });
            };
            load();
        }
        return remoteImage.frame;
    }

    /**
     * 加载远程spine
     * @param url spine的json地址
     * @param cb 可选，回调
     * @example
     *      let spine = this.nodeRemoteSkeleton.addComponent(sp.Skeleton);
     *      let skeletonData = await xfire.loadRemoteSpine('https://imgcdn.orbn.top/g/test/spine/color.json');
     *      if (skeletonData) {
     *          spine.skeletonData = skeletonData;
     *          spine.setAnimation(0, '道具3', true);
     *      }
     *      // 不可使用sp.Skeleton的setSkeletonData设置，因为这里返回的是资源与setSkeletonData接收的其实是不同的数据类型
     */
    public loadRemoteSpine(url: string, cb?: (data: sp.SkeletonData) => void): Promise<sp.SkeletonData> {
        let urlImage = cc.path.mainFileName(url) + '.png';
        let urlAtlas = cc.path.mainFileName(url) + '.atlas';
        /** 图片加载 */
        let imageLoader = (url: string) => {
            return new Promise<cc.Texture2D> ((resolve) => {
                cc.loader.load(url, (error, tex) => {
                    if (error || tex == null) {
                        resolve(null);
                    }
                    else {
                        resolve(tex);
                    }
                });
            });
        };
        /** 文本加载 */
        let txtLoader = (url: string) => {
            return new Promise<string> ((resolve) => {
                cc.loader.load({ url, type: 'txt' }, (error, atlas) => {
                    if (error || atlas == null) {
                        resolve(null);
                    }
                    else {
                        // console.log(atlas);
                        resolve(atlas);
                    }
                });
            });
        };
        return new Promise<sp.SkeletonData> ((resolve) => {
            (async () => {
                // 先加载图片
                let texture: cc.Texture2D = null;
                for (let i = 0; i < 5; i++) {
                    texture = await imageLoader(urlImage);
                    if (texture != null) {
                        break;
                    }
                }
                if (texture == null) {
                    if (cb) {
                        cb(null);
                    }
                    resolve(null);
                    return;
                }
                // 加载atlas
                let atlas: string = null;
                for (let i = 0; i < 5; i++) {
                    atlas = await txtLoader(urlAtlas);
                    if (atlas != null) {
                        break;
                    }
                }
                if (atlas == null) {
                    texture.destroy();
                    if (cb) {
                        cb(null);
                    }
                    resolve(null);
                    return;
                }
                // 加载spine脚本
                let json: string = null;
                for (let i = 0; i < 5; i++) {
                    json = await txtLoader(url);
                    if (json != null) {
                        break;
                    }
                }
                if (json == null) {
                    texture.destroy();
                    if (cb) {
                        cb(null);
                    }
                    resolve(null);
                    return;
                }
                // 构建sp.SkeletonData
                let asset: any = new sp.SkeletonData();
                asset._uuid = url;
                asset.skeletonJson = json;
                asset.atlasText = atlas;
                asset.textures = [texture];
                asset.textureNames = [cc.path.basename(urlImage)];
                if (cb) {
                    cb(asset);
                }
                resolve(asset);
                // skeleton.skeletonData = asset;
                // skeleton.animation = 'walk';
                // skeleton._updateSkeletonData();
            })();
        });
    }

    /**
     * 加载远程音频，支持回调或promise，加载失败内部会自动重试，重试次数在xfire_config中配置
     * @param url 音频url
     * @param cb 回调，可空
     */
    public loadRemoteAudio(url: string, cb?: (audio: cc.AudioClip) => void): Promise<cc.AudioClip> {
        let loadFn = (u: string) => {
            return new Promise<cc.AudioClip>((resolve) => {
                cc.loader.load(u, (err, audio: cc.AudioClip) => {
                    if (err || audio == null) {
                        resolve(null);
                        return;
                    }
                    resolve(audio);
                });
            });
        };

        return new Promise<cc.AudioClip>((resolve) => {
            (async () => {
                let retry = XFireConfigs.远程音频加载重试次数;
                do {
                    let audio = await loadFn(url);
                    if (audio) {
                        if (cb) cb(audio);
                        resolve(audio);
                        return;
                    }
                    await xfire.sleep(XFireConfigs.远程音频加载重试间隔);
                    retry--;
                } while (retry >= 0);
                if (cb) cb(null);
                resolve(null);
            })();
        });

    }

    /**
     * 释放远程图片
     * @param url 图片地址
     * @param incFix 是否包括固化的图片
     */
    public releaseRemoteImage(url: string, incFix = false): void {
        let img = mapImageCache[url];
        if (!img) {
            return;
        }
        if (img.fix && !incFix) {
            return;
        }

        if (img.loaded) {
            img.frame.setTexture(null);
            cc.loader.release(img.url);
        }
        img.loading = false;
        img.loaded = false;
        delete mapImageCache[url];
        let index = aryImageCache.indexOf(img);
        if (index >= 0) {
            aryImageCache.splice(index, 1);
        }
    }

    /**
     * 加载本地resources目录下的图片，不需要扩展名
     * 实例：xfire.loadResourceImage('Image/小程序码256');
     * @param imagePath 位于resources下的图片
     */
    public loadResourceImage(imagePath: string): cc.SpriteFrame {
        let frame = cacheResourceImage[imagePath];
        if (frame == null) {
            cacheResourceImage[imagePath] = frame = new cc.SpriteFrame();
        }
        else {
            return frame;
        }
        // 纹理加载方式加载图片，这样可以方便的实现同步获取spriteFrame，但当使用自动图集时会失效
        // 保留这段代码作为参考 2019年7月11日
        /*
        cc.loader.loadRes(imagePath, cc.Texture2D, (err, tex) => {
            if (err) {
                console.error(err);
                return;
            }
            frame.setTexture(tex);
        });*/
        // 直接加载spriteFrame
        cc.loader.loadRes(imagePath, cc.SpriteFrame, (err, spriteFrame: cc.SpriteFrame) => {
            if (err) {
                console.error(err);
                return;
            }
            frame.setTexture(spriteFrame.getTexture(), spriteFrame.getRect(), spriteFrame.isRotated(), spriteFrame.getOffset(), spriteFrame.getOriginalSize());
        });
        return frame;
    }

    public releaseResourceImage(imagePath: string) {
        let frame = cacheResourceImage[imagePath];
        if (frame != null) {
            frame.destroy();
            cc.loader.releaseRes(imagePath);
        }
    }

    /**
     * 加载本地resources目录下的图集，不需要扩展名
     * 实例：xfire.loadResourceImage('Image/2048数值集)
     * 异步范例：
     * (async () => {
     *     await xfire.sleep(5);
     *     this.spriteLocal.spriteFrame = (await xfire.loadResourceSpriteAtlas('Image/2048数值集')).getSpriteFrame('game_num_0002');
     * })();
     * @param plistPath 位于resources目录下的图集文件
     */
    public loadResourceSpriteAtlas(plistPath: string, cb?: (atlas: cc.SpriteAtlas) => void): Promise<cc.SpriteAtlas> {
        return new Promise<cc.SpriteAtlas>((resolve) => {
            let atlas = cacheResourceSpriteAtlas[plistPath];
            if (atlas != null) {
                if (cb) {
                    cb(atlas);
                }
                resolve(atlas);
                return;
            }
            // 直接加载spriteFrame
            cc.loader.loadRes(plistPath, cc.SpriteAtlas, (err, atlas) => {
                if (err) {
                    let atlas = cacheResourceSpriteAtlas[plistPath];
                    if (cb) {
                        cb(atlas);
                    }
                    resolve(atlas);
                    return;
                }
                cacheResourceSpriteAtlas[plistPath] = atlas;
                if (cb) {
                    cb(atlas);
                }
                resolve(atlas);
            });
        });
    }

    /**
     * 加载远程图集，失败会自动重试一定次数
     * 实例：xfire.loadRemoteSpriteAtlas('https://imgcdn.orbn.top/g/test/2048数值集.plist'))
     * 异步范例：
     * (async () => {
     *     await xfire.sleep(5);
     *     let atlas = await xfire.loadRemoteSpriteAtlas('https://imgcdn.orbn.top/g/test/2048数值集.plist'));
     *     if (atlas) {
     *         this.spriteLocal.spriteFrame = atlas.getSpriteFrame('game_num_0002');
     *     }
     * })();
     * @param plistUrl 图集plist文件完整url
     * @param cb 回调
     */
    public loadRemoteSpriteAtlas(plistUrl: string, cb?: (atlas: cc.SpriteAtlas) => void): Promise<cc.SpriteAtlas> {
        const BRACE_REGEX = /[\{\}]/g;
        let parseSize = (sizeStr: string) => {
            let str = sizeStr.slice(1, -1);
            let arr = str.split(',');
            let width = parseFloat(arr[0]);
            let height = parseFloat(arr[1]);
            return new cc.Size(width, height);
        };
        let parseVec2 = (vec2Str: string) => {
            let str = vec2Str.slice(1, -1);
            let arr = str.split(',');
            let x = parseFloat(arr[0]);
            let y = parseFloat(arr[1]);
            return new cc.Vec2(x, y);
        };
        let parseTriangles = (trianglesStr: string) => {
            return trianglesStr.split(' ').map(parseFloat);
        };
        let parseVertices = (verticesStr: string) => {
            return verticesStr.split(' ').map(parseFloat);
        };
        let parseRect = (rectStr: string) => {
            let str = rectStr.replace(BRACE_REGEX, '');
            let arr = str.split(',');
            return new cc.Rect(
                parseFloat(arr[0] || '0'),
                parseFloat(arr[1] || '0'),
                parseFloat(arr[2] || '0'),
                parseFloat(arr[3] || '0')
            );
        };
        let parse = (plist, texture) => {
            let info = plist.metadata;
            let frames = plist.frames;
            let atlas = new cc.SpriteAtlas();
            let spriteFrames = (atlas as any)._spriteFrames;

            for (let key in frames) {
                if (!frames.hasOwnProperty(key)) {
                    continue;
                }
                let frame = frames[key];
                let rotated = false;
                let sourceSize;
                let offsetStr;
                let textureRect;
                // let trimmed = frame.trimmed;
                if (info.format === 0) {
                    rotated = false;
                    // trimmed = frame.trimmed;
                    sourceSize = `{${frame.originalWidth},${frame.originalHeight}}`;
                    offsetStr = `{${frame.offsetX},${frame.offsetY}}`;
                    textureRect = `{{${frame.x},${frame.y}},{${frame.width},${frame.height}}}`;
                }
                else if (info.format === 1 || info.format === 2) {
                    rotated = frame.rotated;
                    // trimmed = frame.trimmed;
                    sourceSize = frame.sourceSize;
                    offsetStr = frame.offset;
                    textureRect = frame.frame;
                }
                else if (info.format === 3) {
                    rotated = frame.textureRotated;
                    // trimmed = frame.trimmed;
                    sourceSize = frame.spriteSourceSize;
                    offsetStr = frame.spriteOffset;
                    textureRect = frame.textureRect;
                }

                let sprite = new cc.SpriteFrame();

                sprite.setTexture(texture, parseRect(textureRect), !!rotated, parseVec2(offsetStr), parseSize(sourceSize));
                if (frame.triangles) {
                    let vertices = parseVertices(frame.vertices);
                    let verticesUV = parseVertices(frame.verticesUV);

                    (sprite as any).vertices = {
                        triangles: parseTriangles(frame.triangles),
                        x: [],
                        y: [],
                        u: [],
                        v: []
                    };

                    for (let i = 0; i < vertices.length; i += 2) {
                        (sprite as any).vertices.x.push(vertices[i]);
                        (sprite as any).vertices.y.push(vertices[i + 1]);
                    }
                    for (let i = 0; i < verticesUV.length; i += 2) {
                        (sprite as any).vertices.u.push(verticesUV[i]);
                        (sprite as any).vertices.v.push(verticesUV[i + 1]);
                    }
                }

                let name = cc.path.mainFileName(key);
                spriteFrames[name] = sprite;
            }
            return atlas;
        };

        let loadFn = (url: string) => {
            return new Promise<cc.SpriteAtlas>((resolve) => {
                (async () => {
                    let result = await this.httpGetString(encodeURI(url));
                    if (result.error) {
                        console.log(`加载plist失败：${result.error}，url: ${url}`);
                        return resolve(null);
                    }
                    let plist = (cc as any).plistParser.parse(result.content);
                    let textureUrl = plist.metadata.realTextureFileName || plist.metadata.textureFileName;
                    textureUrl = (cc.path as any).join(cc.path.dirname(plistUrl), textureUrl);
                    cc.loader.load({ url: encodeURI(textureUrl), type: 'jpg' }, (err, tex) => {
                        if (err) {
                            return resolve(null);
                        }
                        let atlas = parse(plist, tex);
                        cacheResourceSpriteAtlas[plistUrl] = atlas;
                        return resolve(atlas);
                    });
                })();
            });
        };

        return new Promise<cc.SpriteAtlas>((resolve) => {
            (async () => {
                let retry = XFireConfigs.远程图集加载重试次数;
                do {
                    let atlas = await loadFn(plistUrl);
                    if (atlas) {
                        if (cb) cb(atlas);
                        resolve(atlas);
                        return;
                    }
                    await xfire.sleep(XFireConfigs.远程图集加载重试间隔);
                    retry--;
                } while (retry >= 0);
                if (cb) cb(null);
                resolve(null);
            })();
        });
    }

    /**
     * repeatCount为0表无限循环
     */
    public schedule(fn: () => void, timemillis: number, repeatCountIn = 0) {
        let repeatCount = repeatCountIn;
        let repeat = repeatCount === 0;
        let wrap = () => {
            setTimeout(() => {
                fn();
                if (repeat) {
                    wrap();
                }
                else {
                    repeatCount--;
                    if (repeatCount <= 0) {
                        return;
                    }
                    else {
                        wrap();
                    }
                }
            }, timemillis);
        };
        wrap();
    }

    public scheduleOnce(fn: () => void, timemillis: number) {
        this.schedule(fn, timemillis, 1);
    }

    /**
     * 延迟指定秒
     * @param timeSecond 单位秒
     * @param driveComponent 驱动组件，不指定将使用setTimeout(游戏进入后台都可能运行)
     */
    public sleep(timeSecond: number, driveComponent?: cc.Component): Promise<number> {
        return new Promise<number>((resolve) => {
            if (driveComponent) {
                driveComponent.scheduleOnce(() => {
                    resolve(timeSecond);
                }, timeSecond);
            }
            else {
                setTimeout(() => {
                    resolve(timeSecond);
                }, timeSecond * 1000);
            }
        });
    }

    /**
     * 将字符串转为Utf8
     */
    public stringToUtf8(str: string): Uint8Array {
        const utf8_firstbytemaskval: number[] = [0x0, 0x0, 0xC0, 0xE0, 0xF0, 0xF8, 0xFC];
        let bytes = new Uint8Array(str.length * 4);
        let pDst = 0;
        let pSrc = 0;
        let pSrcEnd = str.length;
        while (pSrc < pSrcEnd) {
            let cChar = str.charCodeAt(pSrc++);
            let bytesToWrite = 0;
            let byteMask = 0xBF;
            let byteMark = 0x80;
            if (cChar >= UNI_SUR_HIGH_START && cChar <= UNI_SUR_HIGH_END) {
                if (pSrc >= pSrcEnd) {
                    return null;
                }
                let cChar2 = str.charCodeAt(pSrc++);
                if (cChar2 >= UNI_SUR_LOW_START && cChar2 <= UNI_SUR_LOW_END) {
                    cChar = ((cChar - UNI_SUR_HIGH_START) << HalfShift) + (cChar2 - UNI_SUR_LOW_START) + HalfBase;
                }
                else {
                    return null;
                }
            }
            else if (cChar >= UNI_SUR_LOW_START && cChar <= UNI_SUR_LOW_END) {
                return null;
            }
            if (cChar < 0x80) {
                bytesToWrite = 1;
            }
            else if (cChar < 0x800) {
                bytesToWrite = 2;
            }
            else if (cChar < 0x10000) {
                bytesToWrite = 3;
            }
            else if (cChar < 0x110000) {
                bytesToWrite = 4;
            }
            else {
                bytesToWrite = 3;
                cChar = 0x0000FFFD;
            }
            pDst += bytesToWrite;
            if (bytesToWrite === 4) {
                bytes[--pDst] = (cChar | byteMark) & byteMask; cChar >>= 6;
            }
            if (bytesToWrite >= 3) {
                bytes[--pDst] = (cChar | byteMark) & byteMask; cChar >>= 6;
            }
            if (bytesToWrite >= 2) {
                bytes[--pDst] = (cChar | byteMark) & byteMask; cChar >>= 6;
            }
            if (bytesToWrite >= 1) {
                bytes[--pDst] = (cChar | utf8_firstbytemaskval[bytesToWrite]);
            }
            pDst += bytesToWrite;
        }
        return bytes.subarray(0, pDst);
    }

    /**
     * 将utf8转为js字符串
     * @param u8 输入的utf8字符串
     */
    public utf8ToString(u8: Uint8Array): string {
        let result = '';
        if (u8 == undefined) {
            return result;
        }
        let pSrc = 0;
        let pSrcEnd = pSrc + u8.length;

        while (pSrc < pSrcEnd) {
            let cChar = 0;
            let nExtraBytesToRead = tbl_TrailingBytesForUTF8[u8[pSrc]];
            if (pSrc + nExtraBytesToRead >= pSrcEnd) {
                return '';
            }
            // if (!IsLegalUtf8(pSrc, nExtraBytesToRead + 1))
            //  return "";
            for (let n = nExtraBytesToRead; n > 0; n--) {
                cChar += u8[pSrc++]; cChar <<= 6;
            }
            cChar += u8[pSrc++];

            cChar -= OffsetsFromUTF8[nExtraBytesToRead];

            if (cChar < UNI_MAX_BMP) {
                if (cChar >= UNI_SUR_HIGH_START && cChar <= UNI_SUR_LOW_END) {
                    return '';
                }
                result += String.fromCharCode(cChar);
            }
            else if (cChar > UNI_MAX_UTF16) {
                return '';
            }
            else {
                cChar -= HalfBase;
                let n1 = ((cChar >> HalfShift) + UNI_SUR_HIGH_START);
                let n2 = ((cChar & HalfMask) + UNI_SUR_LOW_START);
                result += String.fromCharCode(n1, n2);
            }
        }
        return result;
    }

    /**
     * 字符串格式化 如：xfire.formatString('科技：{0}，解锁需要钻石：{1}', '护罩强化', 50)
     */
    public formatString(str: string, ...args: any) {
        return !!str && str.replace(/\{(\d+)\}/g, (t, r) => {
            return args[r] ? args[r] : t;
        });
    }

    /**
     * 日期格式化
     * @param str 格式模板，如：yyyy-MM-dd HH:mm:ss
     * @param date 日期时间
     * @example
     * 格式化当前时间
     * xfire.formatDate('yyyy-MM-dd HH:mm:ss', new Date())
     * 格式化指定时间戳
     * xfire.formatDate('yyyy-MM-dd HH:mm:ss', new Date(1577808000000))
     */
    public formatDate(str: string, date: Date) {
        let ret: RegExpExecArray;
        let fmt = str;
        const opt = {
            'y+': date.getFullYear().toString(),        // 年
            'M+': (date.getMonth() + 1).toString(),     // 月
            'd+': date.getDate().toString(),            // 日
            'H+': date.getHours().toString(),           // 时
            'm+': date.getMinutes().toString(),         // 分
            's+': date.getSeconds().toString()          // 秒
            // 有其他格式化字符需求可以继续添加，必须转化成字符串
        };
        for (let key in opt) {
            if (!opt.hasOwnProperty(key)) {
                continue;
            }
            ret = new RegExp('(' + key + ')').exec(fmt);
            if (ret) {
                fmt = fmt.replace(ret[1], (ret[1].length === 1) ? (opt[key]) : (this.padStart(opt[key], ret[1].length, '0')));
            }
        }
        return fmt;
    }

    /** 对象复制，包括数组 */
    public copy<T>(obj: T): T {
        if (typeof obj !== 'object') {
            return obj;
        }
        if (obj instanceof Array) {
            let newArray = [];
            for (let i = 0; i < obj.length; i++) {
                newArray[i] = this.copy(obj[i]);
            }
            return newArray as unknown as T;
        }
        else {
            let newobj: any = {};
            for (let attr in obj) {
                if (!obj.hasOwnProperty(attr)) {
                    continue;
                }
                let val: any = obj[attr];
                if (typeof val === 'object') {
                    newobj[attr] = this.copy(val);
                }
                else {
                    newobj[attr] = val;
                }
            }
            return newobj as T;
        }
    }

    /**
     * 判断平台是否支持剪贴板操作
     */
    public supportClipboard() {
        return false;
    }

    /**
     * 将字符串复制到剪贴板，成功true，失败false
     * @param content 拷贝内容
     */
    public setClipboardData(content: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            resolve(false);
        });
    }

    /**
     * 获取剪贴板内容
     */
    public getClipboardData(): Promise<string> {
        return new Promise<string>((resolve) => {
            resolve('');
        });
    }

    /**
     * 版本比较，返回1表v1大于v2，返回0表相同，返回-1表v1小于v2
     * @param v1 如'1.0.0'
     * @param v2 如'1.0.0'
     */
    public compareVersion(v1: string, v2: string): number {
        let lv1 = v1.split('.');
        let lv2 = v2.split('.');
        const len = Math.max(lv1.length, lv2.length);

        while (lv1.length < len) {
            lv1.push('0');
        }
        while (lv2.length < len) {
            lv2.push('0');
        }

        for (let i = 0; i < len; i++) {
            const num1 = parseInt(lv1[i], 10);
            const num2 = parseInt(lv2[i], 10);

            if (num1 > num2) {
                return 1;
            } else if (num1 < num2) {
                return -1;
            }
        }

        return 0;
    }

    /**
     * 获取结点的高度数组
     * 如果未挂入场景，则返回数组的首个值为-1
     */
    public getNodeOrderArray(_node: cc.Node): number[] {
        let node = _node;
        let ret: number[] = [];
        while (node != null) {
            ret.unshift((node as any)._localZOrder);
            if (node.parent == null) {
                break;
            }
            node = node.parent;
        }
        if (node !== cc.director.getScene()) {
            ret.unshift(-1);
        }
        return ret;
    }

    /**
     * 对比两个结点高度
     * 返回1表node1高于node2，返回0表相同，返回-1表node1低于node2
     */
    public compareNodeOrder(_node1: cc.Node, _node2: cc.Node): number {
        let aryHeight1 = this.getNodeOrderArray(_node1);
        let aryHeight2 = this.getNodeOrderArray(_node2);
        let index = 0;
        while (true) {
            let h1 = aryHeight1[index];
            let h2 = aryHeight2[index];
            if (h1 == null) {
                return -1;
            }
            else if (h2 == null) {
                return 1;
            }
            if (h1 > h2) {
                return 1;
            }
            else if (h1 < h2) {
                return -1;
            }
            index++;
        }
    }

    /**
     * 向指定接口请求文本内容
     * @param url 请求地址
     * @param params 请求参数组合
     * @param post 是否已post方式发送请求
     */
    public httpGetString(url: string, params: { [key: string]: boolean | number | string } = null, post = false): Promise<{
        content?: string;
        error?: string;
    }> {
        let lParams = params || {};
        let lUrl = url;
        let strParams = '';
        for (let attr in lParams) {
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

        if (!post && strParams !== '') {
            lUrl = lUrl + '?' + strParams;
        }

        let p = new Promise<{
            content?: string;
            error?: string;
        }>((resolve) => {
            let req = cc.loader.getXMLHttpRequest();
            req.onload = (e) => {
                if (req.status === 200 || req.status === 304) {
                    resolve({ content: req.responseText });
                }
                else {
                    resolve({ error: 'code:' + req.status });
                }
            };
            req.ontimeout = (e) => {
                resolve({ error: 'ontimeout' });
            };
            req.onerror = (e) => {
                resolve({ error: JSON.stringify(e) });
            };

            req.open(post ? 'POST' : 'GET', lUrl, true);
            req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded;charset=utf-8');
            req.send(post ? strParams : '');
        });

        return p;
    }

    /**
     * 向指定接口请求文本内容并解析成json对象返回
     * @param url 请求地址
     * @param params 请求参数组合
     * @param post 是否已post方式发送请求
     */
    public httpGetJson(url: string, params: { [key: string]: boolean | number | string } = null, post = false): Promise<{
        json?: any;
        error?: string;
    }> {
        let p = new Promise<{
            json?: any;
            error?: string;
        }>((resolve) => {
            this.httpGetString(url, params, post).then((result) => {
                if (result.content == null) {
                    resolve({ error: result.error });
                    return;
                }
                try {
                    let json = JSON.parse(result.content);
                    resolve({ json });
                } catch (error) {
                    resolve({ error: 'json解析失败' });
                    return;
                }
            });
        });

        return p;
    }

    public httpGetStringWithBody(url: string, body: string): Promise<{
        content?: string;
        error?: string;
    }> {
        let p = new Promise<{
            content?: string;
            error?: string;
        }>((resolve) => {
            let req = cc.loader.getXMLHttpRequest();
            req.onload = (e) => {
                if (req.status === 200 || req.status === 304) {
                    let text = req.responseText;
                    // 字节跳动低版本（如7.0.8）有bug会自动将json返回转换为对象
                    if (typeof text !== 'string') {
                        text = JSON.stringify(text);
                    }
                    resolve({ content: text });
                }
                else {
                    resolve({ error: 'code:' + req.status });
                }
            };
            req.ontimeout = (e) => {
                resolve({ error: 'ontimeout' });
            };
            req.onerror = (e) => {
                resolve({ error: JSON.stringify(e) });
            };

            req.open('POST', url, true);
            req.setRequestHeader('Content-type', 'text/plain;charset=utf-8');
            req.send(body);
        });

        return p;
    }

    public httpGetJsonWithBody(url: string, body: string | { [key: string]: any }): Promise<{
        json?: any;
        error?: string;
    }> {
        let content = typeof body === 'string' ? body : JSON.stringify(body);

        let p = new Promise<any>((resolve, reject) => {
            this.httpGetStringWithBody(url, content).then((result) => {
                if (result.content == null) {
                    resolve({ error: result.error });
                    return;
                }
                try {
                    let json = JSON.parse(result.content);
                    resolve({ json });
                } catch (error) {
                    resolve({ error: 'json解析失败' });
                    return;
                }
            });
        });
        return p;
    }

    /**
     * 指定范围内取整数
     * @param startInc 开始（含）
     * @param endExc 结束（不含）
     */
    public getRandomInteger(startInc: number, endExc: number) {
        let start = Math.floor(startInc);
        let end = Math.floor(endExc);
        return Math.floor(start + (end - start) * Math.random());
    }

    /**
     * 随机获取一个数组成员
     * @param ary 成员数组
     */
    public getRandomMember<T>(ary: T[]): T {
        return ary[Math.floor(Math.random() * ary.length)];
    }

    /**
     * 排除指定下标后随机取数组下标，用途如随机武器更换，在武器数组排除当前武器
     * 再取随机
     * @param arySize 数组大小
     * @param exclude 排除下标
     * 出错返回-1
     */
    public getRandomIndexExcept(arySize: number, exclude: number): number {
        if (arySize < 1) {
            return -1;
        }
        if (arySize === 1 && exclude === 0) {
            return -1;
        }
        let dec = 0;
        if (exclude >= 0 && exclude < arySize) {
            dec = 1;
        }
        let index = Math.floor(Math.random() * (arySize - dec));
        if (dec === 1 && index >= exclude) {
            return index + 1;
        }
        return index;
    }

    /**
     * 按权重随机取数组下标
     * @param ary 权重数组或者包含weight属性的对象数组
     */
    public getRandomIndexByWeight(ary: number[] | { weight: number }[]): number {
        let weights: number[] = [];
        if (typeof ary[0] === 'number') {
            weights = ary as number[];
        }
        else {
            for (let obj of ary as { weight: number }[]) {
                weights.push(obj.weight);
            }
        }
        let rand = Math.random();
        // 计算权重总值
        let totalWeight = 0;
        for (let weight of weights) {
            totalWeight += weight > 0 ? weight : 0;
        }
        if (totalWeight === 0) {
            return Math.floor(weights.length * rand);
        }
        rand *= totalWeight;
        // 取下标
        let searchWeight = 0;
        let index = 0;
        for (let weight of weights) {
            searchWeight += weight > 0 ? weight : 0;
            if (searchWeight > rand) {
                return index;
            }
            index++;
        }
    }

    /**
     * 在圆内【均匀】取随机点
     * @param origin 圆心坐标
     * @param radius 圆半径
     */
    public getRandomPointInCircle(origin: cc.Vec2, radius: number): cc.Vec2 {
        let angle = Math.PI * 2 * Math.random();
        let r = Math.sqrt(radius * radius * Math.random());
        return cc.v2(Math.cos(angle) * r + origin.x, Math.sin(angle) * r + origin.y);
    }

    /**
     * 将Uint8Array进行base64编码，可处理utf8字符串或字节流
     * @param u8 uint8数组
     */
    public base64EncodeUtin8Array(u8: Uint8Array): string {
        const base64CharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let result = '';
        if (u8 == null || u8.length === 0) {
            return result;
        }
        let nSrcSize = u8.length;

        let pSrc = 0;
        let tbl_base64 = base64CharMap;
        while (nSrcSize >= 3) {
            let nCode = u8[pSrc++];
            result += tbl_base64.charAt(nCode >> 2);

            let nCode2 = u8[pSrc++];
            nCode = ((nCode & 3) << 4) | (nCode2 >> 4);
            result += tbl_base64.charAt(nCode);

            nCode = u8[pSrc++];
            result += tbl_base64.charAt(((nCode2 & 0xF) << 2) + (nCode >> 6));

            result += tbl_base64.charAt(nCode & 63);

            nSrcSize -= 3;
        }
        switch (nSrcSize) {
            case 1:
                {
                    let nCode = u8[pSrc++];
                    result += tbl_base64.charAt(nCode >> 2);
                    result += tbl_base64.charAt((nCode & 3) << 4);
                    // 按规定添加2个'='
                    result += '==';
                }
                break;
            case 2:
                {
                    let nCode = u8[pSrc++];
                    let nCode2 = u8[pSrc++];
                    result += tbl_base64.charAt(nCode >> 2);
                    result += tbl_base64.charAt(((nCode & 3) << 4) + (nCode2 >> 4));
                    result += tbl_base64.charAt((nCode2 & 0xF) << 2);
                    // 按规定添加1个'='
                    result += '=';
                }
                break;
        }

        return result;
    }

    /**
     * 将字符串编码为base64
     */
    public base64Encode(input: string): string {
        let u8 = this.stringToUtf8(input);
        return this.base64EncodeUtin8Array(u8);
    }

    /**
     * 解码base64为Uint8Array
     */
    // tslint:disable-next-line: cyclomatic-complexity
    public base64DecodeToUint8Array(base64: string): Uint8Array {
        const tbl_base64decode: number[] = [
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 62, 255, 255, 255, 63,
            52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 255, 255, 255, 254, 255, 255, // 这里254是指= 与其他无效编码略作区分
            255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
            15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 255, 255, 255, 255, 255, // 96
            255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, // 112
            41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255
        ];
        if (base64 == null || base64 === '' || (base64.length & 3) > 0) {
            return null;
        }
        let nSrcSize = base64.length;
        let u8 = new Uint8Array(Math.floor(nSrcSize * 3 / 4) + 1);
        let pDst = 0;
        let pSrc = 0;
        while (nSrcSize > 4) {
            let nCode = tbl_base64decode[base64.charCodeAt(pSrc++)];
            let nCode2 = tbl_base64decode[base64.charCodeAt(pSrc++)];
            if (nCode == undefined || nCode2 == undefined || nCode2 > 64 || nCode > 64) {
                return null;
            }
            u8[pDst++] = (nCode << 2) | (nCode2 >> 4);

            nCode = tbl_base64decode[base64.charCodeAt(pSrc++)];
            if (nCode == undefined || nCode > 64) {
                return null;
            }
            u8[pDst++] = ((nCode2 & 0xF) << 4) | (nCode >> 2);

            nCode2 = tbl_base64decode[base64.charCodeAt(pSrc++)];
            if (nCode2 == undefined || nCode2 > 64) {
                return null;
            }
            u8[pDst++] = ((nCode & 3) << 6) | nCode2;
            nSrcSize -= 4;
        }
        if (base64.charAt(pSrc + 3) === '=') // 这个没有问题 因为合法base64长度必然是4的倍数
        {
            let nCode = tbl_base64decode[base64.charCodeAt(pSrc + 0)];
            let nCode2 = tbl_base64decode[base64.charCodeAt(pSrc + 1)];
            if (nCode == undefined || nCode2 == undefined || nCode > 64 || nCode2 > 64) {
                return null;
            }
            u8[pDst++] = (nCode << 2) | (nCode2 >> 4);
            if (base64.charAt(pSrc + 2) !== '=') {
                nCode = tbl_base64decode[base64.charCodeAt(pSrc + 2)];
                if (nCode == undefined || nCode > 64) {
                    return null;
                }
                u8[pDst++] = ((nCode2 & 0xF) << 4) | (nCode >> 2);
            }
        }
        else {
            let nCode = tbl_base64decode[base64.charCodeAt(pSrc++)];
            let nCode2 = tbl_base64decode[base64.charCodeAt(pSrc++)];
            if (nCode == undefined || nCode2 == undefined || nCode2 > 64 || nCode > 64) {
                return null;
            }
            u8[pDst++] = (nCode << 2) | (nCode2 >> 4);

            nCode = tbl_base64decode[base64.charCodeAt(pSrc++)];
            if (nCode == undefined || nCode > 64) {
                return null;
            }
            u8[pDst++] = ((nCode2 & 0xF) << 4) | (nCode >> 2);

            nCode2 = tbl_base64decode[base64.charCodeAt(pSrc++)];
            if (nCode2 == undefined || nCode2 > 64) {
                return null;
            }
            u8[pDst++] = ((nCode & 3) << 6) | nCode2;
        }
        return u8.subarray(0, pDst);
    }

    // 解码base64为字符串
    public base64Decode(input: string): string {
        let u8 = this.base64DecodeToUint8Array(input);
        return this.utf8ToString(u8);
    }

    /**
     * rc4加密
     * https://www.cnblogs.com/gambler/p/9075415.html
     * @param text 待加密明文
     * @param key 密钥，字节长度限制为1-256
     * @returns 返回base64编码
     */
    public encrypt(_text: string, _key: string): string {
        let text = this.stringToUtf8(_text);
        let key = this.stringToUtf8(_key);
        /** 状态向量，固定256字节，作为密钥流生成种子，初始化为0-255 */
        let sbox = Array(256);
        for (let i = 0; i < 256;) {
            sbox[i] = i++; sbox[i] = i++; sbox[i] = i++; sbox[i] = i++;
        }
        // 密钥轮转填满256字节，对sbox进行置换操作
        for (let i = 0, j = 0; i < 256; i++) {
            j = (j + sbox[i] + key[i % key.length]) % 256;
            let temp = sbox[i];
            sbox[i] = sbox[j];
            sbox[j] = temp;
        }
        // 密钥流生成并与原文异或加密
        for (let x = 0, i = 0, j = 0; x < text.length; x++) {
            i = (i + 1) % 256;
            j = (j + sbox[i]) % 256;
            let temp = sbox[i];
            sbox[i] = sbox[j];
            sbox[j] = temp;
            let k = (sbox[i] + (sbox[j] % 256)) % 256;
            text[x] = text[x] ^ sbox[k];
        }
        return this.base64EncodeUtin8Array(text);
    }

    /**
     * RC4解密，因为RC4对称的，核心采用异或加密，所以解密算法与加密算法一致
     * @param _input 加密后的内容，base64或Uint8Array
     * @param _key 密钥
     * @returns 失败会返回空字符串（''而非null）
     */
    public decrypt(_input: string | Uint8Array, _key: string): string {
        let text: Uint8Array = _input as Uint8Array;
        if (typeof _input === 'string') {
            text = this.base64DecodeToUint8Array(_input);
        }
        let key = this.stringToUtf8(_key);
        /** 状态向量，固定256字节，作为密钥流生成种子，初始化为0-255 */
        let sbox = Array(256);
        for (let i = 0; i < 256;) {
            sbox[i] = i++; sbox[i] = i++; sbox[i] = i++; sbox[i] = i++;
        }
        // 密钥轮转填满256字节，对sbox进行置换操作
        for (let i = 0, j = 0; i < 256; i++) {
            j = (j + sbox[i] + key[i % key.length]) % 256;
            let temp = sbox[i];
            sbox[i] = sbox[j];
            sbox[j] = temp;
        }
        // 密钥流生成并与原文异或解密
        for (let x = 0, i = 0, j = 0; x < text.length; x++) {
            i = (i + 1) % 256;
            j = (j + sbox[i]) % 256;
            let temp = sbox[i];
            sbox[i] = sbox[j];
            sbox[j] = temp;
            let k = (sbox[i] + (sbox[j] % 256)) % 256;
            text[x] = text[x] ^ sbox[k];
        }
        return this.utf8ToString(text);
    }

    /**
     * 获取url中的请求参数
     * 主要用于一些h5平台
     * @param name 参数名
     */
    public getUrlParam(name: string) {
        let location = window.location;
        if (typeof location !== 'object') {
            return null;
        }
        let str = location.search;
        if (typeof str !== 'string') {
            return null;
        }
        str = decodeURI(str.substring(1));
        let params = str.split('&');
        for (let param of params) {
            let pair = param.split('=');
            if (pair[0] === name) {
                return pair[1];
            }
        }
        return null;
    }

    /**
     * 屏幕截取
     * @param params 截屏参数
     */

    public captureScreen(params?: {
        root?: cc.Node;
        pos?: cc.Vec2;
        size?: cc.Size;
        mask?: number;
        keepAlpha?: boolean;    // 默认false，如果指定将保留alpha
        returnPixels?: boolean; // 默认false，如果指定将返回
    }): XRenderTexture {
        try {
            let scene = cc.director.getScene();
            let lParams = params || {};
            let isScene = lParams.root == null;
            let root = lParams.root || scene;
            let size = lParams.size || (isScene ? cc.view.getVisibleSize() : cc.size(root.width, root.height));
            let keepAlpha = lParams.keepAlpha || false;
            let returnPixels = lParams.returnPixels || false;
            if (size.width <= 0) {
                size.width = 100;
            }
            if (size.height <= 0) {
                size.height = 100;
            }
            let pos = lParams.pos || (isScene ? cc.v2(cc.view.getVisibleSize().width / 2, cc.view.getVisibleSize().height / 2) : cc.v2(0, 0));
            let mask = lParams.mask || 0xFFFFFFFF;
            let node = new cc.Node();
            let camera = node.addComponent(cc.Camera);
            node.parent = root;
            node.setPosition(pos);
            camera.cullingMask = mask;

            let texture = new cc.RenderTexture();
            let gl = (cc as any).game._renderContext;
            texture.initWithSize(size.width, size.height, gl.STENCIL_INDEX8);
            camera.targetTexture = texture;
            camera.render(root);
            node.destroy();

            // 截图下来的图是上下颠倒的，这里进行翻转
            {
                let mask = keepAlpha ? 0 : 0xFF000000;
                let data = texture.readPixels();
                let data32 = new Uint32Array(data.buffer);
                let width = texture.width;
                let height = texture.height;
                {
                    let newD = new Uint8Array(data.length);
                    let newD32 = new Uint32Array(newD.buffer);
                    let n = 0;
                    for (let y = height - 1; y >= 0; y--) {
                        let line = y * width;
                        for (let x = 0; x < (width >>> 2); x++) {
                            newD32[n++] = data32[line++] | mask;
                            newD32[n++] = data32[line++] | mask;
                            newD32[n++] = data32[line++] | mask;
                            newD32[n++] = data32[line++] | mask;
                        }
                        for (let x = 0; x < (width & 3); x++) {
                            newD32[n++] = data32[line++] | mask;
                        }
                    }
                    data = newD;
                }
                let newTex = new XRenderTexture();
                if (returnPixels) {
                    newTex.pixels = data;
                }
                newTex.initWithData(data as any, cc.Texture2D.PixelFormat.RGBA8888, width, height);
                texture.destroy();
                return newTex;
            }

        } catch (error) {
            console.error('截图失败，不要在onEnable中进行同步截图' + JSON.stringify(error));
            return null;
        }

        /*if (cc.sys.platform === cc.sys.DESKTOP_BROWSER) {
            let canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            let ctx = canvas.getContext('2d');
            let imgData = ctx.createImageData(width, height);
            imgData.data.set(data, 0);
            ctx.putImageData(imgData, 0, 0);
        }*/
    }

    /**
     * 在某个字符串前面填充字符串从而达到指定长度，比如'123'填充成'0123'
     * @param str 要填充的字符串
     * @param targetLength 目标长度
     * @param padString 要填充的字符串，会重复
     * @returns 返回一个新的填充好的字符串
     * @example <caption>给一个数字字符串前面填充0，达到8位</caption>
     * str = padStart(str, 8, '0')
     */
    public padStart(str: string, targetLength: number, padString: string): string {
        let lTargetLength = targetLength >> 0; // 数字取整，非数字转0
        let lPadString = String((typeof padString !== 'undefined' ? padString : ' '));
        if (str.length > targetLength) {
            return String(str);
        }
        else {
            lTargetLength = targetLength - str.length;
            while (lTargetLength > lPadString.length) {
                lPadString += lPadString;
            }
            return lPadString.slice(0, lTargetLength) + String(str);
        }
    }

    /**
     * 在某个字符串后面填充字符串从而达到指定长度
     * @param str 要填充的字符串
     * @param targetLength 目标长度
     * @param padString 要填充的字符串，会重复
     * @returns 返回一个新的填充好的字符串
     */
    public padEnd(str: string, targetLength: number, padString: string): string {
        let lTargetLength = targetLength >> 0; // 数字取整，非数字转0
        let lPadString = String((typeof padString !== 'undefined' ? padString : ' '));
        if (str.length > targetLength) {
            return String(str);
        }
        else {
            lTargetLength = targetLength - str.length;
            while (lTargetLength > lPadString.length) {
                lPadString += lPadString;
            }
            return String(str) + lPadString.slice(0, lTargetLength);
        }
    }

    /**
     * 判断某个按键是否按下
     * @param keyCode 按键编码
     * @example <caption>判断ctrl是否按下</caption>
     * xfire.isKeyPressed(cc.macro.KEY.ctrl)
     */
    public isKeyPressed(keyCode: cc.macro.KEY): boolean {
        return this.pressedKeys[keyCode] === true;
    }

    // tslint:disable-next-line: cyclomatic-complexity
    protected createAdvertisements() {
        let adsdkcfg = this.getSdkConfig();
        if (adsdkcfg == null) {
            console.log('尚未配置广告sdk：' + this.getAdSdkName());
            return;
        }
        if (adsdkcfg.ads == null) {
            console.log('广告配置中没有具体的广告');
            return;
        }
        for (let cfg of adsdkcfg.ads) {
            if (cfg == null) {
                continue;
            }
            let ad: Ad = null;
            if (cfg.alias != null) {
                ad = new AliasAd(adsdkcfg, cfg);
            }
            else if (cfg.type === 'banner') {
                if (this.supportBannerAd()) {
                    ad = this.createBannerAd(adsdkcfg, cfg);
                }
            }
            else if (cfg.type === 'video') {
                if (this.supportVideoAd()) {
                    ad = this.createVideoAd(adsdkcfg, cfg);
                }
            }
            else if (cfg.type === 'interstitial') {
                if (this.supportInterstitialAd()) {
                    ad = this.createInterstitialAd(adsdkcfg, cfg);
                }
                else {
                    console.log('不支持插屏：' + cfg.name);
                }
            }
            else if (cfg.type === 'grid') {
                if (this.supportGridAd()) {
                    ad = this.createGridAd(adsdkcfg, cfg);
                }
            }
            else if (cfg.type === 'box') {
                if (this.supportAppBoxAd()) {
                    ad = this.createAppBoxAd(adsdkcfg, cfg);
                }
                else {
                    console.log('不支持盒子广告：' + cfg.name);
                }
            }
            else if (cfg.type === 'fullscreen') {
                if (this.supportFullscreenAd()) {
                    ad = this.createFullscreenAd(adsdkcfg, cfg);
                }
                else {
                    console.log('不支持全屏广告：' + cfg.name);
                }
            }
            else if (cfg.type === 'feeds') {
                if (this.supportFeedsAd()) {
                    ad = this.createFeedsAd(adsdkcfg, cfg);
                }
                else {
                    console.log('不支持信息流广告：' + cfg.name);
                }
            }
            else if (cfg.type === 'block') {
                if (this.supportBlockAd()) {
                    ad = this.createBlockAd(adsdkcfg, cfg);
                }
                else {
                    console.log('不支持积木广告：' + cfg.name);
                }
            }
            if (ad != null) {
                this.advertisements[cfg.name] = ad;
                ad.load();
            }
        }
    }

    protected nativeOnShow(cb: (options?: LaunchOptions) => void): void {
        cc.game.on(cc.game.EVENT_SHOW, () => {
            if (cb != null) {
                cb();
            }
        });
    }

    protected nativeOnHide(cb: () => void) {
        cc.game.on(cc.game.EVENT_HIDE, () => {
            cb();
        });
    }

    protected init(config: AppConfig, createAdvertisements = true) {
        this.appConfig = config;
        // 有些平台不能马上创建，需要初始化，此时可覆写本函数
        if (createAdvertisements) {
            this.createAdvertisements();
        }
    }

    protected getNavigateAppConfig(name: string): NavigateApp {
        let sdkConfig = this.getSdkConfig();
        if (sdkConfig == null || sdkConfig.navigateApps == null) {
            console.log('未配置跳转列表');
            return null;
        }
        for (let app of sdkConfig.navigateApps) {
            if (app.name === name) {
                return app;
            }
        }
        return null;
    }

    /**
     * 游戏内坐标转平台坐标转换，node非空则输入坐标相对于node坐标，否则相对于游戏内逻辑屏幕
     */
    protected rectFromNodeToPlat(node: cc.Node, left: number, top: number, width: number, height: number): { left: number; top: number; width: number; height: number } {
        let sysInfo = this.getSystemInfoSync();
        let ratio = cc.view.getVisibleSize().width / sysInfo.screenWidth;
        if (node != null) {
            let lt = node.convertToWorldSpaceAR(cc.v2(left, top));
            let rb = node.convertToWorldSpaceAR(cc.v2(left + width, top - height));
            let lLeft = lt.x / ratio;
            let lTop = (cc.view.getVisibleSize().height - lt.y) / ratio;
            return { left: lLeft, top: lTop, width: (rb.x - lt.x) / ratio, height: (lt.y - rb.y) / ratio };
        }
        else {
            return { left: left / ratio, top: top / ratio, width: width / ratio, height: height / ratio };
        }

    }

    protected getAd(name: string, autoTransAlias = true, type: string = null) {
        let ad = this.advertisements[name];
        if (ad == null) {
            return ad;
        }
        if (!autoTransAlias || ad.config.alias == null) {
            if (type == null || ad.config.type === type) {
                return ad;
            }
            else {
                return null;
            }
        }

        return this.getAd(ad.config.alias, autoTransAlias, type);
    }

    protected nativePay(orderId: string, goodsName: string, count: number, price: number, goodsId: string) {

    }

    protected nativeSetPayNotifier(notifier: {
        success?: (orderInfo: OrderInfo) => void;
        cancel?: (orderInfo: OrderInfo) => void;
        fail?: (orderInfo: OrderInfo, failMsg: string) => void;
    }) {
    }

    protected listenKeyEvent() {
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, (event: cc.Event.EventKeyboard) => {
            this.pressedKeys[event.keyCode] = true;
        }, this);

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, (event: cc.Event.EventKeyboard) => {
            this.pressedKeys[event.keyCode] = false;
        }, this);
    }

    /**
     * 内部分发加速度数据
     * @param x 单位g
     * @param y 单位g
     * @param z 单位g
     */
    protected dispatchAccelerometerChange(x: number, y: number, z: number, normalized: boolean) {
        let cbs = this.copy(this.accCbs);
        for (let cb of cbs) {
            if (cb) {
                try {
                    cb({x, y, z, normalized});
                } catch (error) {
                    console.error(error);
                }
            }
        }
    }

    /**
     * 支付成功
     * @param orderId 订单号
     */
    private onPaySuccess(orderId: string, goodsName: string, count: number) {

    }

    private createLayerMonitor() {
        if (CC_EDITOR) {
            return;
        }
        let curScene = cc.director.getScene();
        if (!curScene) {
            console.error('尚未创建场景');
            return;
        }
        let node = new cc.Node(LAYER_MONITOR_NAME);
        node.zIndex = cc.macro.MAX_ZINDEX;
        node.parent = curScene;
        node.width = cc.view.getVisibleSize().width * 2;
        node.height = cc.view.getVisibleSize().height * 2;
        cc.game.addPersistRootNode(node);
        cc.director.getScheduler().schedule((dt) => {
            this._gameTime += dt;
        }, node, 0);
        this.layerMonitor = node;
        {
            let cb = (event: cc.Event.EventTouch) => {
                this.lastTouchTimestamp = this._gameTime;
            };
            node.on(cc.Node.EventType.TOUCH_START, cb, node, true);
            node.on(cc.Node.EventType.TOUCH_MOVE, cb, node, true);
            node.on(cc.Node.EventType.TOUCH_END, cb, node, true);
            node.on(cc.Node.EventType.TOUCH_CANCEL, cb, node, true);
            if ((node as any)._touchListener == null) {
                console.error('Node没有_touchListener');
            }
            else {
                (node as any)._touchListener.swallowTouches = false;
            }
        }
    }
}

// #################################################################################################################
// #################################################################################################################
// #################################################################################################################

enum COMPARE {
    BIGGER = 1,
    LESS = -1,
    EQUAL = 0
}

export enum TimeZone {
    Newyork = -5,   // 纽约
    London = 0,     // 英国
    Thailand = 7,   // 泰国
    BeiJing = 8,    // 中国大陆、港澳台、台湾、蒙古、新加坡、马来西亚、菲律宾
    Tokyo = 9       // 日本、韩国、朝鲜
}

export interface NormalDate {
    year: number;
    month: number;          // 1-12
    date: number;           // 1-31
    day: number;            // 0-6表星期一到星期天
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
    timestamp: number;
    zone: number;
}

export interface SystemInfo {
    brand: string;           // 设备品牌
    model: string;           // 设备型号
    pixelRatio: number;      // 设备像素比
    screenWidth: number;     // 屏幕宽，单位像素
    screenHeight: number;    // 屏幕高，单位像素
    windowWidth: number;     // 可使用窗口宽度，单位像素
    windowHeight: number;    // 可使用窗口高度，单位像素
    language: string;        // 语言
}

export interface LoginResult {
    plat: string;
    appid?: string;         // 炫火appid
    userid?: string;        // 用户id，快手
    code?: string;          // 微信 qq 百度 字节跳动 vivo会用
    signature?: string;     // 开心网会用
    token?: string;         // oppo、魅族会用
    account?: string;       // 小米
    session?: string;       // 小米
    ticket?: string;        // 趣头条
    platform?: string;      // 趣头条
    nickname?: string;
    avatar?: string;
    gender?: number;        // 0未知 1男性 2女性
    username?: string;      // 账号密码登录用
    password?: string;      // 账号密码登录用
}

export interface AdCfg {
    name: string;
    alias?: string;
    duration?: number;
    type?: string;
    id?: string;
    /** size、orientation用于qq的积木广告，orientation取landscape或vertical */
    style?: { left: number; top?: number; bottom?: number; width: number; height: number; size?: number; orientation?: number };    // 游戏内逻辑坐标
}

export interface PayPointCfg {
    name: string;
    id?: string;
    goods: string;
    count: number;
    price: number;
    desc: string;
}

export interface NavigateApp {
    name: string;
    appId: string;
    custom?: { [key: string]: any };
    enable: boolean;
}

export interface SdkCfg {
    name?: string;
    appid?: string;
    allowGuest?: boolean;
    adValidIdleTimeRange?: number;  // 可覆盖AppConfig里的adValidIdleTimeRange 方便sdk区别对待
    adIdleTimeToRefresh?: number;   // 可覆盖AppConfig里的adIdleTimeToRefresh
    params?: { [key: string]: string };
    ads?: AdCfg[];
    payPoints?: PayPointCfg[];
    navigateApps?: NavigateApp[];
    withdraw?: any;
}

export interface AppConfig {
    appid?: string;
    version?: string;
    channel?: string;
    // 全局统计广告展示时间时，如果用户闲置时间超过本值，将不计入广告的展示时间，
    // 防止用户长时间闲置时刷新广告 浪费展示机会（微信小游戏有展示次数上限）
    // 默认为10秒
    adValidIdleTimeRange?: number;
    // 广告闲置多久进行刷新 仅刷新展示时间足够的广告）
    // 默认为3秒
    adIdleTimeToRefresh?: number;
    sdks?: SdkCfg[];
}

export interface LoginError {
    msg: string;
}

export interface LaunchOptions {
    scene: number;
    query: any;
    referrerInfo: any;
    shareTicket?: string;
}

export interface ShareInfo {
    title?: string;
    imageUrl?: string;
    query?: string;
    success?: () => void;
    fail?: () => void;
    complete?: () => void;
}

export interface OrderInfo {
    orderid: string;
    goodsName: string;
    goodsId?: string;
    count: number;
    price?: number;
}

export class XRenderTexture extends cc.Texture2D {
    public pixels: Uint8Array;
}

export abstract class Ad {
    public sdkConfig: SdkCfg = null;
    public config: AdCfg = null;
    public enable = false;
    public platObj = null;

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        this.sdkConfig = sdkConfig;
        this.config = config;
        // style格式化
        if (config.style == null) {
            config.style = { left: 0, top: 0, bottom: 0, width: 0, height: 0 };
        }
        else if (config.style.top != null && config.style.bottom != null) {
            console.error('style不能同时指定top和bottom');
        }
        let style = config.style;
        style.width = style.width || 0;
        style.height = style.height || 0;
        if (style.width > 0 && style.height > 0) {
            if (style.bottom != null && style.top == null) {
                style.top = cc.winSize.height - style.bottom - style.height;
            }
            if (style.left == null) {
                style.left = (cc.winSize.width - style.width) / 2;
            }
        }
        style.left = style.left || 0;
        style.top = style.top || 0;
        style.bottom = style.bottom || 0;
    }
    public isReady(): boolean {
        return this.enable;
    }
    public update(dtSecond: number, idleTimeSecond: number) { }
    public abstract load(): void;
}

class AliasAd extends Ad {
    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
    }

    public load(): void {
    }

    public update(dtSecond: number, idleTimeSecond: number): void {
    }
}

// 横幅广告
export abstract class BannerAd extends Ad {
    public static needToRefreshBanners = false;
    // 刷新banner的可见性
    public static refreshBanners() {
        if (!BannerAd.needToRefreshBanners) {
            return;
        }
        let inst = XFireApp.getInstance();
        if (!inst) {
            return;
        }
        for (let key in inst.advertisements) {
            if (!inst.advertisements.hasOwnProperty(key)) {
                continue;
            }
            let ad = inst.advertisements[key];
            if (ad == null || ad.config.alias != null || ad.config.type !== 'banner') {
                continue;
            }
            let banner = ad as BannerAd;
            if (!banner.dstVisible && (banner.visible || banner.toShow)) {
                banner.hide();
            }
        }
        for (let key in inst.advertisements) {
            if (!inst.advertisements.hasOwnProperty(key)) {
                continue;
            }
            let ad = inst.advertisements[key];
            if (ad == null || ad.config.alias != null || ad.config.type !== 'banner') {
                continue;
            }
            let banner = ad as BannerAd;
            if (banner.dstVisible && !banner.visible) {
                banner.show();
            }
        }
        this.needToRefreshBanners = false;
    }
    public dstVisible = false;      // 集中在任务栈清空后设置banner可见性 从而可以避免一个任务栈期间多次设置
    public toShow = false;
    public visible = false;
    private time = 0;
    private duration = 0;

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        this.duration = config.duration || 0;
    }

    // 表示平台自身是否支持自动刷新 如果支持自动刷新 那么我们的自动刷新会失效
    public abstract supportAutoRefresh();

    public show(): void {
        if (this.isReady() && !this.visible) {
            this.visible = true;
            this.toShow = false;
            this.nativeShow();
        }
        else if (!this.isReady()) {
            console.log('banner尚未加载：', this.config.name);
            this.toShow = true;
        }
    }

    public hide(): void {
        if (this.isReady() && this.visible) {
            this.visible = false;
            this.toShow = false;
            this.nativeHide();
        }
        else {
            this.visible = false;
            this.toShow = false;
        }
    }

    public moveTo(bottom: number): void {
    }

    public moveToEx(left: number, top: number, width: number, height: number) {
    }

    public get size(): { width: number; height: number } {
        return { width: 0, height: 0 };
    }

    public update(dtSecond: number, idleTimeSecond: number): void {
        if (this.supportAutoRefresh() || !this.visible || this.duration <= 0) {
            return;
        }
        let range = this.sdkConfig.adValidIdleTimeRange;
        if (range == null) {
            range = XFireConfigs.广告自动刷新有效计时限制;
        }
        if (range === 0 || idleTimeSecond < range) {
            this.time += dtSecond;
        }
        let idleTimeLimit = this.sdkConfig.adIdleTimeToRefresh;
        if (idleTimeLimit == null) {
            idleTimeLimit = XFireConfigs.广告自动刷新闲置时间限制;
        }
        if (this.time > this.duration && idleTimeSecond >= idleTimeLimit) {
            this.time = 0;
            this.reload();
        }
    }

    public reload(): void {
        console.log('刷新：' + this.config.name);
    }
    public destroy() { }
    protected abstract nativeShow(): void;
    protected abstract nativeHide(): void;
}

// 视频广告
export abstract class VideoAd extends Ad {
    public play(cb: (end: boolean) => void): void {
        if (this.isReady()) {
            this.nativePlay(cb);
        }
        else {
            console.log('视频未就绪：' + this.config.name);
        }
    }

    public update(dtSecond: number, idleTimeSecond: number): void {

    }

    public destroy() { }
    protected abstract nativePlay(cb: (end: boolean) => void): void;
}

// 格子广告
export abstract class GridAd extends Ad {
    public toShow = false;
    public visible = false;

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (config.style == null) {
            config.style = { left: 0, bottom: 0, width: 0, height: 0 };
        }
    }

    public show(): void {
        if (this.isReady()) {
            this.nativeShow();
        }
    }

    public hide(): void {
        this.nativeHide();
    }

    public moveTo(bottom: number): void {
    }

    public get size(): { width: number; height: number } {
        return { width: 0, height: 0 };
    }

    public destroy(): void {
    }
    protected abstract nativeShow(): void;
    protected abstract nativeHide(): void;
}

// 插屏广告
export abstract class InterstitialAd extends Ad {
    public show(): void {
        if (this.isReady()) {
            this.nativeShow();
        }
    }

    public destroy() { }
    protected abstract nativeShow(): void;
}

// 插屏广告
export abstract class AppBoxAd extends Ad {
    public show(): void {
        if (this.isReady()) {
            this.nativeShow();
        }
    }

    public destroy() { }
    protected abstract nativeShow(): void;
}

/**
 * 全屏广告，比如全屏视频，与激励视频的区别：通常看一会就可以直接关闭，不与奖励绑定
 */
export abstract class FullscreenAd extends Ad {
    public show(): void {
        if (this.isReady()) {
            this.nativeShow();
        }
    }

    protected abstract nativeShow(): void;
}

// 信息流广告
export abstract class FeedsAd extends Ad {
    public show(): void {
        if (this.isReady()) {
            this.nativeShow();
        }
    }

    public hide(): void {
        this.nativeHide();
    }

    public moveTo(left: number, top: number, width: number, height: number): void {
    }

    public destroy() { }
    protected abstract nativeShow(): void;
    protected abstract nativeHide(): void;
}

/** 积木广告 */
export abstract class BlockAd extends Ad {
    public toShow = false;
    public visible = false;

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (config.style == null) {
            config.style = { left: 0, bottom: 0, width: 0, height: 0 };
        }
    }

    public show(): void {
        if (this.isReady() && !this.visible) {
            this.visible = true;
            this.toShow = false;
            this.nativeShow();
        }
        else if (!this.isReady()) {
            console.log('积木广告尚未加载：', this.config.name);
            this.toShow = true;
        }
    }

    public hide(): void {
        if (this.isReady() && this.visible) {
            this.visible = false;
            this.toShow = false;
            this.nativeHide();
        }
        else {
            this.visible = false;
            this.toShow = false;
        }
    }

    public moveTo(left: number, top: number): void {
    }

    public get size(): { width: number; height: number } {
        return { width: 0, height: 0 };
    }

    public destroy(): void {
    }
    protected abstract nativeShow(): void;
    protected abstract nativeHide(): void;
}

// 更多游戏按钮
export abstract class XMoreGamesButton {
    protected platObj = null;
    protected callbacks: (() => void)[] = [];
    protected nativeCallback: () => void = null;

    public constructor(platObj: any) {
        this.platObj = platObj;
    }
    public abstract show(): void;
    public abstract hide(): void;
    public abstract destroy(): void;

    public onTap(cb: () => void): void {
        if (cb == null) {
            return;
        }
        this.callbacks.push(cb);
        if (this.nativeCallback == null) {
            this.nativeOnTap(() => {
                try {
                    for (let lcb of this.callbacks) {
                        lcb();
                    }
                } catch (error) {
                    console.error(error);
                }
            });
        }
    }
    public offTab(cb: () => void): void {
        for (let i = 0; i < this.callbacks.length; i++) {
            let callback = this.callbacks[i];
            if (callback === cb) {
                this.callbacks.splice(i, 1);
                break;
            }
        }
        if (this.callbacks.length === 0) {
            this.nativeOffTap(this.nativeCallback);
        }
    }
    protected abstract nativeOnTap(cb: () => void): void;
    protected abstract nativeOffTap(cb: () => void): void;
}

// 用户信息获取按钮
export abstract class XUserInfoButton {
    protected platObj = null;
    protected callbacks: ((res: XUserInfoWithSignature) => void)[] = [];
    protected nativeCallback: (res: XUserInfoWithSignature) => void = null;
    public constructor(platObj: any) {
        this.platObj = platObj;
    }

    public abstract show(): void;
    public abstract hide(): void;
    public abstract destroy(): void;
    public onTap(cb: (res: XUserInfoWithSignature) => void): void {
        if (cb == null) {
            return;
        }
        this.callbacks.push(cb);
        if (this.nativeCallback == null) {
            this.nativeOnTap((res: XUserInfoWithSignature) => {
                try {
                    for (let lcb of this.callbacks) {
                        lcb(res);
                    }
                } catch (error) {
                    console.error(error);
                }
            });
        }
    }
    public offTab(cb: (res: XUserInfoWithSignature) => void): void {
        for (let i = 0; i < this.callbacks.length; i++) {
            let callback = this.callbacks[i];
            if (callback === cb) {
                this.callbacks.splice(i, 1);
                break;
            }
        }
        if (this.callbacks.length === 0) {
            this.nativeOffTap(this.nativeCallback);
        }
    }
    protected abstract nativeOnTap(cb: (res: XUserInfoWithSignature) => void): void;
    protected abstract nativeOffTap(cb: any): void;
}

// 意见反馈按钮
export abstract class XFeedbackButton {
    protected platObj = null;
    protected callbacks: (() => void)[] = [];
    protected nativeCallback: () => void = null;
    public constructor(platObj: any) {
        this.platObj = platObj;
    }

    public abstract show(): void;
    public abstract hide(): void;
    public abstract destroy(): void;
    public onTap(cb: () => void): void {
        if (cb == null) {
            return;
        }
        this.callbacks.push(cb);
        if (this.nativeCallback == null) {
            this.nativeOnTap(() => {
                try {
                    for (let lcb of this.callbacks) {
                        lcb();
                    }
                } catch (error) {
                    console.error(error);
                }
            });
        }
    }
    public offTab(cb: () => void): void {
        for (let i = 0; i < this.callbacks.length; i++) {
            let callback = this.callbacks[i];
            if (callback === cb) {
                this.callbacks.splice(i, 1);
                break;
            }
        }
        if (this.callbacks.length === 0) {
            this.nativeOffTap(this.nativeCallback);
        }
    }
    protected abstract nativeOnTap(cb: () => void): void;
    protected abstract nativeOffTap(cb: any): void;
}

export interface XUserInfo {
    nickname: string;
    avatar: string;
    gender: string;
}

export class XUserInfoWithSignature {
    public userInfo: XUserInfo;
    public platSignature: any;

    public constructor(nickname: string, avatar: string, gender: string, platSignature: any) {
        this.userInfo = { nickname, avatar, gender };
        this.platSignature = platSignature;
    }
}
