/**
 * 华为小程序
 * 接口文档地址 https://developer.huawei.com/consumer/cn/doc/development/quickApp-References/quickgame-api-canvas
 * 广告接口：https://developer.huawei.com/consumer/cn/doc/development/quickApp-References/quickgame-api-ad
 * 广告位创建后台：https://developer.huawei.com/consumer/cn/monetize
 *
 * 平台特性：
 *      1.包大小限制20MB
 *      2.广告测试过程需要使用测试广告id
 *          https://developer.huawei.com/consumer/cn/doc/development/HMSCore-Guides/publisher-service-native-0000001050064968
 *          视频：testx9dtjwj8hp
 *          横幅：testw6vs28auh3
 *          插屏: testb4znbuh3n2
 *          原生：testy63txaom86
 *      3.在params下指定bannerAlignTop=数字0可以让banner置顶
 *
 * 发布方法：
 *      1.发布为华为快游戏即可打包出rpk，最小平台版本号设置为1078
 *      2.测试版本的广告id要使用测试id，通过后换正式id，当前测试直接开启xhappcfg.json下的参数华为小程序.params.test即可，不需要设置具体的广告测试id
 *
 * 原生容错：
 *      使用两个id配置华为小程序的feeds广告，第一个展示失败会尝试第二个
 *
 * 测试方法：
 *      1.安装【华为快应用加载器】https://developer.huawei.com/consumer/cn/doc/development/quickApp-Guides/quickapp-installtool
 *      2.华为手机开启开发者调试插入电脑后，可以在构建页面直接选择运行进行调试，否则手动去快应用里打开
 *      3.手动打开的如果要查看日志，打开android studio logcat，以jslog为tag过滤日志，可以查看输出日志
 *
 */

import SimpleUI from '../XModule/SimpleUI';
import { SNode } from '../XModule/SimpleUI/SUIData';
import SUIResLoader from '../XModule/SimpleUI/SUIResLoader';
import XFireApp, { Ad, AdCfg, AppConfig, BannerAd, FeedsAd, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

const huaweiapi: any = (window as any).qg;
const qgapi: any = (window as any).qg;
const Key_Privacy_Agreed = 'hw_key_privacy_agreed';

export default class XFireAppHuawei extends XFireApp{
    public static resLoader: SUIResLoader = null;

    public static bindButtonClickListener(nodeOrBtn: cc.Node | cc.Button, listener: (event: cc.Event) => void) {
        if (xfire.plat !== xfire.PLAT_HUAWEI) {
            return;
        }
        if (nodeOrBtn == null) {
            return;
        }
        let btn = nodeOrBtn instanceof cc.Node ? nodeOrBtn.getComponent(cc.Button) : nodeOrBtn as cc.Button;
        if (btn) {
            let eventHandler = new cc.Component.EventHandler();
            eventHandler.target = btn.node;
            eventHandler.component = 'cc.Button';
            let handlerName = 'onclickDynamic_' + xfire.currentTimeMillis;
            while (btn[handlerName] != null) {
                handlerName = 'onclickDynamic_' + xfire.currentTimeMillis + xfire.getRandomInteger(0, 10000);
            }
            eventHandler.handler = handlerName;
            (btn as any)[handlerName] = listener;
            if (btn.clickEvents == null) btn.clickEvents = [];
            btn.clickEvents.push(eventHandler);
        }
    }
    /** 加速度监听函数 */
    public accCb: (res: {x: number; y: number; z: number}) => void = null;

    public privacyAgreed = false;
    /** 隐私同意后弹出feeds广告，为string为feeds广告名，为true则默认feeds名为通用feeds */
    public popFeedsAfterPrivacyAgreed: string | boolean = null;
    /** feeds自动下载 */
    public feedsAutoDownload = false;
    /** feeds关闭按钮缩放 */
    public feedsCloseButtonScale = 1;
    /** 视频播放次数 */
    public videoPlayTimes = 1;
    /** 华为自动登录监视用 */
    private huaweiLogined = false;

    public constructor() {
        super();
        this.plat = this.PLAT_HUAWEI;
        this.supportGuestLogin = false;
        if (cc.sys.platform !== cc.sys.HUAWEI_GAME) {
            console.error('XFireAppHuawei只可在华为环境下使用');
            return;
        }
        this.privacyAgreed = cc.sys.localStorage.getItem(Key_Privacy_Agreed) === 'true';
        class ResLoader extends SUIResLoader {
            public loadImage(name: string, ext?: string): Promise<cc.SpriteFrame> {
                return new Promise<cc.SpriteFrame>((resolve) => {
                    let localBundle = cc.resources || cc.assetManager.getBundle('Resource');
                    let loadRemote = () => {
                        cc.assetManager.loadRemote('https://imgcdn.orbn.top/g/common/nad/' + name + (ext == null ? '.png' : ext), (err, tex) => {
                            let frame = new cc.SpriteFrame();
                            frame.name = name;
                            if (tex instanceof cc.Texture2D && err == null) {
                                frame.setTexture(tex);
                            }
                            resolve(frame);
                        });
                    };
                    if (localBundle) {
                        localBundle.load('Image/nad/' + name, cc.SpriteFrame, (err, spriteFrame: cc.SpriteFrame) => {
                            if (err) {
                                loadRemote();
                            }
                            else {
                                resolve(spriteFrame);
                            }
                        });
                    }
                    else {
                        loadRemote();
                    }
                });
            }
        }
        XFireAppHuawei.resLoader = new ResLoader();
    }

    public getAdSdkName(): string {
        return '华为小程序';
    }

    public supportAccelerometer(): boolean {
        // 当前华为的加速度接口监听到的数据是各向加速度变化值，无法实现手机倾斜判断
        return false;
    }

    public startAccelerometer() {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        if (!this.supportAccelerometer()) {
            return;
        }
        if (huaweiapi.startAccelerometer) {
            huaweiapi.startAccelerometer({});
            if (this.accCb == null) {
                this.accCb = (res: {x: number; y: number; z: number}) => {
                    this.dispatchAccelerometerChange(res.x, res.y, res.z, false);
                };
                huaweiapi.onAccelerometerChange(this.accCb);
            }
        }
    }

    public stopAccelerometer() {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        if (huaweiapi.stopAccelerometer) {
            huaweiapi.stopAccelerometer({});
        }
    }

    public supportVibrate(): boolean {
        return true;
    }

    public vibrateShort() {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        huaweiapi.vibrateShort();
    }

    public vibrateLong() {
        huaweiapi.vibrateLong();
    }

    public supportLogin(): boolean {
        return false;
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

    public supportFeedsAd(): boolean {
        return true;
    }

    public supportFeedsAdMove(): boolean {
        return true;
    }

    public supportShortcut(): boolean {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        return huaweiapi && huaweiapi.installShortcut != null;
    }

    public installShortcut(): Promise<boolean> {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        return new Promise<boolean>((resolve) => {
            if (!huaweiapi.installShortcut) {
                resolve(false);
                return;
            }
            huaweiapi.installShortcut({
                message: '添加桌面图标，下次快速进入。',
                success: () => {
                    resolve(true);
                },
                fail: (err: any) => {
                    resolve(false);
                }
            });
        });
    }

    public hasShortcutInstalled(): Promise<boolean> {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        return new Promise<boolean>((resolve) => {
            if (!huaweiapi.hasShortcutInstalled) {
                resolve(false);
                return;
            }
            huaweiapi.hasShortcutInstalled({
                success: (res: boolean) => {
                    resolve(res === true);
                },
                fail: (err: any) => {
                    resolve(false);
                }
            });
        });
    }

    public getSystemInfoSync(): SystemInfo {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        let info = huaweiapi.getSystemInfoSync();

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

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        return new BannerAdHuaWei(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        return new VideoAdHuaWei(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        return new InterstitialAdHuaWei(sdkConfig, cfg);
    }

    public createFeedsAd(sdkConfig: SdkCfg, cfg: AdCfg): FeedsAd {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        return new FeedsAdHuaWei(sdkConfig, cfg);
    }

    public isPrivacyAgreed(): boolean {
        return this.privacyAgreed;
    }

    protected init(config: AppConfig, createAdvertisements = true) {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        this.appConfig = config;
        let sdkConfig = this.getSdkConfig();
        super.init(config, false);
        setTimeout(() => {
            if (!this.privacyAgreed) {
                this.popPrivacyDialog();
            }
        }, 0);
        // 尝试拉取服务器参数
        (async () => {
            let ret = await xfireol.getConfigs();
            // console.log(JSON.stringify(ret));
            if (ret.configs != null) {
                let key = '华为广告测试_' + config.version;
                if (ret.configs[key] === true) {
                    if (sdkConfig) {
                        sdkConfig.params.test = true;
                    }
                }
                key = '隐私确认弹原生_' + config.version;
                if (ret.configs[key] != null) {
                    this.popFeedsAfterPrivacyAgreed = ret.configs[key];
                }
                key = '原生自动下载_' + config.version;
                if (ret.configs[key]) {
                    this.feedsAutoDownload = true;
                }
                key = '原生关闭按钮缩放_' + config.version;
                if (typeof ret.configs[key] === 'number') {
                    this.feedsCloseButtonScale = ret.configs[key];
                }
                key = '视频播放次数_' + config.version;
                if (typeof ret.configs[key] === 'number') {
                    this.videoPlayTimes = ret.configs[key];
                }
            }
            if (sdkConfig.params.test) {
                console.log('【测试】');
            }
            this.createAdvertisements();
        })();

        // 登录华为账号
        let doLogin = (): Promise<void> => {
            return new Promise<void> ((resolve) => {
                huaweiapi.showLoading({
                    title: '登录中',
                    mask: true
                });
                huaweiapi.gameLogin({
                    forceLogin: 1,
                    appid: sdkConfig.appid,
                    success: (res: any) => {
                        console.log('华为账号登录成功');
                        this.huaweiLogined = true;
                    },
                    fail(data: any, code: any) {
                        console.log('华为账号登录失败: ' + data + ',' + code);
                        // xfire.exit();
                    },
                    complete: () => {
                        resolve();
                        huaweiapi.hideLoading({});
                    }
                });
            });
        };
        // 后台自动登录监视，自动重新登录，保留供参考 [2021年11月11日 老张]
        /*(async () => {
            while (!this.huaweiLogined) {
                await doLogin();
                // 登录失败 则在用户操作时重新拉起登录
                if (!this.huaweiLogined) {
                    let userActiveTime = this.lastTouchTimestamp;
                    do {
                        await xfire.sleep(1);
                    }while (userActiveTime === this.lastTouchTimestamp);
                }
            }
        })();*/
        // 强制弹窗登录
        let forceLogin = async () => {
            await doLogin();
            if (!this.huaweiLogined) {
                huaweiapi.showModal({
                    title: '登录异常',
                    content: '游戏需要登录华为账号。',
                    confirmText: '重新登录',
                    showCancel: false,
                    success: () => {
                        forceLogin();
                    }
                });
            }
        };
        forceLogin();
    }

    private popPrivacyDialog(): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        let privacyUrl: string = (this.getSdkConfig().params.privacyUrl as string) || 'https://imgcdn.orbn.top/g/common/hwprivacyTMP.txt';
        let layerAd = xfire.getLayerNativeAd();
        if (layerAd == null) {
            console.log('异常，不存在原生广告层');
            return null;
        }
        let iData: SNode = {'name': '结点_隐私协议排版', 'size': [720, 1280], 'components': [{'name': 'Widget', 'properties': {'left': 0, 'top': 0, 'right': 0, 'bottom': 0, 'alignMode': null}}, {'name': 'BlockInput'}], 'children': [{'name': '黑底', 'color': '000000', 'opacity': 192, 'size': [720, 1280], 'components': [{'name': 'Sprite', 'properties': {'image': 'bg1x1', 'type': 0, 'sizeMode': 0}}, {'name': 'Widget', 'properties': {'left': 0, 'top': 0, 'right': 0, 'bottom': 0, 'alignMode': null}}]}, {'name': 'root', 'size': [720, 1280], 'components': [{'name': 'Widget', 'properties': {'top': 0, 'bottom': 0, 'alignMode': null}}], 'children': [{'name': '对话框', 'children': [{'name': 'bg', 'size': [600, 420], 'components': [{'name': 'Sprite', 'properties': {'image': 'bg1x1', 'type': 0, 'sizeMode': 0}}]}, {'name': '标题', 'color': '000000', 'pos': [0, 175.723], 'size': [500, 70], 'components': [{'name': 'Label', 'properties': {'string': '用户协议和隐私政策', 'hAlign': 1, 'vAlign': 1, 'fontSize': 45, 'lineHeight': 75, 'overflow': 2, 'cacheMode': 0}}, {'name': 'Widget', 'properties': {'top': -210.723, 'alignMode': null}}]}, {'name': '描述', 'color': '000000', 'pos': [0, 71.738], 'size': [533, 133], 'components': [{'name': 'Label', 'properties': {'string': '感谢您使用本游戏。您使用本游戏前应当阅读并同意我们的用户协议和隐私政策。', 'hAlign': 0, 'vAlign': 1, 'fontSize': 33, 'lineHeight': 35, 'overflow': 2, 'cacheMode': 0}}]}, {'name': '按钮同意', 'pos': [0, -114.081], 'size': [200, 67], 'components': [{'name': 'Button', 'properties': {'transition': 3, 'zoomScale': 1.2, 'normalSprite': 'default_btn_normal'}}], 'children': [{'name': 'Background', 'color': 'ff8500', 'size': [200, 67], 'components': [{'name': 'Sprite', 'properties': {'image': '圆角矩形', 'type': 1, 'sizeMode': 0, 'slice': [11, 11, 11, 11]}}], 'children': [{'name': 'Label', 'size': [80, 63], 'components': [{'name': 'Label', 'properties': {'string': '同意', 'hAlign': 1, 'vAlign': 1, 'fontSize': 40, 'lineHeight': 50, 'overflow': 0, 'cacheMode': 0}}]}]}]}, {'name': '按钮不同意', 'pos': [0, -199.632], 'size': [80, 25], 'scale': [0.8, 0.8], 'components': [{'name': 'Button', 'properties': {'transition': 3, 'zoomScale': 1.2, 'normalSprite': 'x3'}}], 'children': [{'name': 'Background', 'size': [90, 90], 'children': [{'name': 'New Label', 'color': '000000', 'size': [75, 50.4], 'components': [{'name': 'Label', 'properties': {'string': '不同意', 'hAlign': 1, 'vAlign': 1, 'fontSize': 25, 'lineHeight': 40, 'overflow': 0, 'cacheMode': 0}}]}]}]}, {'name': '点击查看', 'children': [{'name': '点击查看：', 'color': '000000', 'pos': [-102.204, -45], 'size': [160, 50.4], 'components': [{'name': 'Label', 'properties': {'string': '点击查看：', 'hAlign': 1, 'vAlign': 1, 'fontSize': 22, 'lineHeight': 40, 'overflow': 2, 'cacheMode': 0}}]}, {'name': '用户协议', 'color': '001fff', 'pos': [19.532, -45], 'size': [100, 30], 'components': [{'name': 'Label', 'properties': {'string': '用户协议', 'hAlign': 0, 'vAlign': 0, 'fontSize': 20, 'lineHeight': 22, 'overflow': 2, 'cacheMode': 0}}, {'name': 'Button', 'properties': {'transition': 0, 'normalSprite': 'default_btn_normal'}}]}, {'name': '隐私政策', 'color': '001fff', 'pos': [138.532, -45], 'size': [100, 30], 'components': [{'name': 'Label', 'properties': {'string': '隐私政策', 'hAlign': 0, 'vAlign': 0, 'fontSize': 20, 'lineHeight': 22, 'overflow': 2, 'cacheMode': 0}}, {'name': 'Button', 'properties': {'transition': 0, 'normalSprite': 'default_btn_normal'}}]}]}]}, {'name': '文本框', 'size': [720, 1280], 'components': [{'name': 'Widget', 'properties': {'top': 0, 'bottom': 0, 'alignMode': null}}], 'children': [{'name': '文本', 'pos': [0, 540], 'anchor': [0.5, 1], 'size': [720, 28], 'components': [{'name': 'Label', 'properties': {'string': '加载中...', 'hAlign': 0, 'vAlign': 0, 'fontSize': 24, 'lineHeight': 28, 'overflow': 3, 'cacheMode': 2}}, {'name': 'Widget', 'properties': {'top': 100, 'alignMode': null}}, {'name': 'Dragger', 'properties': {'dragThreshold': 15, 'realtimeSet': false, 'up': true, 'down': true, 'left': false, 'right': false}}]}, {'name': '按钮返回', 'pos': [0, -526.5], 'size': [200, 67], 'components': [{'name': 'Button', 'properties': {'transition': 3, 'zoomScale': 1.2, 'normalSprite': 'default_btn_normal'}}, {'name': 'Widget', 'properties': {'bottom': 80, 'alignMode': null}}], 'children': [{'name': 'Background', 'color': 'ff8500', 'size': [200, 67], 'components': [{'name': 'Sprite', 'properties': {'image': '圆角矩形', 'type': 1, 'sizeMode': 0, 'slice': [11, 11, 11, 11]}}]}, {'name': 'Label', 'size': [80, 63], 'components': [{'name': 'Label', 'properties': {'string': '返回', 'hAlign': 1, 'vAlign': 1, 'fontSize': 40, 'lineHeight': 50, 'overflow': 0, 'cacheMode': 0}}]}]}]}]}]};
        let node = SimpleUI.instantiate(iData, XFireAppHuawei.resLoader);
        // 取出一些关键点
        let root = node.getChildByName('root');
        node.zIndex = cc.macro.MAX_ZINDEX;
        node.parent = layerAd;
        // 对话框
        let nodeDialog = cc.find('root/对话框', node);
        nodeDialog.active = true;
        if (cc.view.getVisibleSize().height < cc.view.getVisibleSize().width) {
            nodeDialog.scale = cc.view.getVisibleSize().height / 720;
        }
        // 文本框
        let nodeTextFrame = cc.find('root/文本框', node);
        nodeTextFrame.active = false;
        // 文本
        let nodeText = cc.find('root/文本框/文本', node);
        // 按钮同意
        XFireAppHuawei.bindButtonClickListener(cc.find('root/对话框/按钮同意', node), () => {
            cc.sys.localStorage.setItem(Key_Privacy_Agreed, 'true');
            this.privacyAgreed = true;
            node.destroy();
            if (this.popFeedsAfterPrivacyAgreed != null) {
                let feedsName: string = null;
                if (typeof this.popFeedsAfterPrivacyAgreed === 'string') {
                    feedsName = this.popFeedsAfterPrivacyAgreed;
                }
                else if (this.popFeedsAfterPrivacyAgreed) {
                    feedsName = '通用feeds';
                }
                if (feedsName) {
                    xfire.showFeedsAd(feedsName);
                }
            }
        });
        // 按钮不同意
        XFireAppHuawei.bindButtonClickListener(cc.find('root/对话框/按钮不同意', node), () => {
            xfire.exit();
        });
        // 点击 用户协议
        XFireAppHuawei.bindButtonClickListener(cc.find('root/对话框/点击查看/用户协议', node), () => {
            nodeDialog.active = false;
            nodeTextFrame.active = true;
            let lbl = nodeText.getComponent(cc.Label);
            lbl.string = '加载中...';
            if (lbl) {
                (async () => {
                    let result = await xfire.httpGetString('https://imgcdn.orbn.top/g/common/hwservice.txt');
                    lbl.string = result.content == null ? '' : result.content;
                })();
            }
        });
        // 点击 隐私政策
        XFireAppHuawei.bindButtonClickListener(cc.find('root/对话框/点击查看/隐私政策', node), () => {
            nodeDialog.active = false;
            nodeTextFrame.active = true;
            let lbl = nodeText.getComponent(cc.Label);
            lbl.string = '加载中...';
            if (lbl) {
                (async () => {
                    let result = await xfire.httpGetString(privacyUrl);
                    let appname = this.getSdkConfig().params.appName || '';
                    let company = this.getSdkConfig().params.company || '';
                    let content = result.content == null ? '' : result.content;
                    content = content.replace(/（%主体%）/g, `（${company}）`);
                    content = content.replace(/（%应用%）/g, `（${appname}）`);
                    lbl.string = content;
                })();
            }
        });
        // 点击文本框中的返回
        XFireAppHuawei.bindButtonClickListener(cc.find('root/文本框/按钮返回', node), () => {
            nodeTextFrame.active = false;
            nodeDialog.active = true;
        });
    }
}

class BannerAdHuaWei extends BannerAd{
    private scaleToPlat = 1;
    private closedTime = 0;
    private userClosed = false;
    private bannerAlignTop = false;
    private bannerTop = 0;
    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        let screenSize = cc.view.getVisibleSize();
        let sysInfo = huaweiapi.getSystemInfoSync();
        this.scaleToPlat = sysInfo.screenWidth / screenSize.width;

        this.bannerAlignTop = typeof sdkConfig.params.bannerAlignTop === 'number';
        if (this.bannerAlignTop) {
            this.bannerTop = sdkConfig.params.bannerAlignTop as number * this.scaleToPlat;
        }
    }

    public supportAutoRefresh() {
        return true;
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        let info = huaweiapi.getSystemInfoSync();
        let banner = huaweiapi.createBannerAd({
            adUnitId: this.sdkConfig.params.test ? 'testw6vs28auh3' : this.config.id,
            style: {
                top: this.bannerAlignTop ? (this.bannerTop) : info.screenHeight - 57,
                left: (info.screenWidth - 360) / 2,
                height: 57,
                width: 360
            },
            adIntervals: 30,
            success: (code) => {
                console.log('createBannerAd: success');
            }
        });
        this.platObj = banner;
        if (banner == null) {
            console.log('创建banner失败');
        }
        else {
            console.log('创建banner成功');
            banner.onLoad(() => {
                console.log('banner广告加载成功：' + this.config.name);
                // 不要在这里加显示代码，因为华为banner是发出了show之后才加载并自动显示的，这里的回调纯粹的通知而已
            });
            banner.onError((err: any) => {
                console.log('banner广告加载失败：' + this.config.name + ' 错误：' + JSON.stringify(err));
                // this.enable = false;
            });
            banner.onClose(() => {
                this.userClosed = true;
            });
            this.enable = true;
        }
    }

    public destroy(): void {
    }

    public update(dtSecond: number, idleTimeSecond: number) {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        if (this.userClosed) {
            this.closedTime += dtSecond;
            if (this.closedTime >= 60) {
                this.nativeShow();
                this.userClosed = false;
                this.closedTime = 0;
            }
        }
    }

    protected nativeShow(): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        if (!(xfire as XFireAppHuawei).isPrivacyAgreed()) {
            this.userClosed = true;
            this.closedTime = 30;
            return;
        }
        if (this.platObj != null) {
            this.platObj.show();
        }
    }

    protected nativeHide(): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        if (this.platObj != null) {
            this.platObj.hide();
        }
        this.userClosed = false;
        this.closedTime = 0;
    }
}

class VideoAdHuaWei extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;

        let video = huaweiapi.createRewardedVideoAd({
            adUnitId: this.sdkConfig.params.test ? 'testx9dtjwj8hp' : this.config.id,
            success: (code: number) => {
                console.log('ad demo : loadAndShowVideoAd createRewardedVideoAd: success');
                video.load();
            },
            fail: (data: any, code: number) => {
                console.log('ad demo : loadAndShowVideoAd createRewardedVideoAd fail: ' + data + ',' + code);
            }
        });
        if (video != null) {
            console.log('创建video成功:' + this.config.name);
            this.platObj = video;
            video.onError((err: any) => {
                console.log('视频错误' + JSON.stringify(err));
                this.enable = false;
            });
            video.onLoad(() => {
                console.log('视频广告加载成功：' + this.config.name);
                this.enable = true;
            });
            video.onClose((data: any) => {
                if (this.playCb) {
                    this.playCb(data.isEnded === true);
                }
                this.enable = false;
                this.platObj.load();
            });
        }
        else {
            console.log('创建video失败:' + this.config.name);
            this.platObj = null;
            this.enable = false;
        }
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        this.playCb = cb;
        if (this.platObj != null) {
            for (let i = 0; i < (xfire as XFireAppHuawei).videoPlayTimes; i++) {
                this.platObj.show();
            }
        }
    }
}

/** 使用原生广告模拟的插屏，华为要求原生广告使用时才请求 */
class InterstitialAdHuaWei extends InterstitialAd {
    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        let ad = huaweiapi.createInterstitialAd({
            adUnitId: this.sdkConfig.params.test ? 'testb4znbuh3n2' : this.config.id
        });
        this.platObj = ad;
        if (ad == null) {
            console.log('插屏广告创建失败：' + this.config.name);
        }
        else {
            console.log('插屏广告创建成功：' + this.config.name);
            ad.onLoad((data: any) => {
                this.enable = true;
                console.log('插屏广告加载成功：' + this.config.name);
                console.log('插屏 onLoad：' + JSON.stringify(data));
            });
            ad.onClose(() => {
                this.enable = false;
                ad.load();
            });
            ad.load();
        }
    }

    protected nativeShow(): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        if (!this.platObj) {
            return;
        }
        if (!(xfire as XFireAppHuawei).isPrivacyAgreed()) {
            return;
        }
        this.platObj.show();
    }
}

/** 使用原生广告模拟的插屏，华为要求原生广告使用时才请求 */
class FeedsAdHuaWei extends FeedsAd {
    private static cuteCloseTick = 0;
    private nodeAd: cc.Node = null;
    private adId = '';
    /** 准备下载 下载中 准备安装 安装中 已安装 */
    private downloadStatus = '';
    private lblDownload: cc.Label = null;
    /** 标记点击是否已上报，一个onLoad只能一次展示上报 一次点击上报 */
    private clickReported = false;
    /** 标记广告已经点击 */
    private clicked = false;
    /** 动态变化关闭按钮，开启的话则当前一次左上角，下次右上角 */
    private cuteClose = false;
    /** 容错id */
    private id2 = '';
    /** 是否模拟成插屏 */
    private simInterstitial = true;
    /** 关闭回调 */
    private onclose: () => void;

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, xfire.copy(config));
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        this.simInterstitial = config.style == null;
        this.cuteClose = sdkConfig.params && ((sdkConfig.params as any).feedsCuteClose === true || (sdkConfig.params as any).feedsCuteClose === 'true');
        let ids = config.id.split(',');
        if (ids.length > 1) {
            this.config.id = ids[0];
            this.id2 = ids[1];
        }
        this.simInterstitial = config.style == null;
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        this.enable = true;
            /**
             * uniqueId形如99c45532-09e4-417c-b554-c96acd14994d，status依次：WAITING DOWNLOADING DOWNLOADFAILED PAUSE INSTALL INSTALLING INSTALLED
             */
    }

    public moveTo(left: number, top: number, width: number, height: number): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        if (this.nodeAd == null) {
            return;
        }
        let root = this.nodeAd.getChildByName('root');
        let containerWidth = width;
        let containerHeight = height;
        let scale = Math.min(containerWidth / 900, containerHeight / 630);
        root.scale = scale;
        root.setPosition(-cc.view.getVisibleSize().width / 2 + left + width / 2,
            cc.view.getVisibleSize().height / 2 - top - height / 2
        );
    }

    protected nativeShow(onclose: () => void): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        this.onclose = null;
        if (!(xfire as XFireAppHuawei).isPrivacyAgreed()) {
            return;
        }
        let fn = async (id: string, forError = false) => {
            if (xfire.plat !== xfire.PLAT_HUAWEI) return;
            let ret = await this.createNative(id);
            if (!ret) {
                return;
            }
            let retLoad = await this.loadNative();

            if (!retLoad) {
                if (!forError && this.id2 !== '') {
                    fn(this.id2, true);
                }
                return;
            }
            this.downloadStatus = '';
            this.instantiateAd(retLoad);
            if (this.nodeAd != null && this.platObj) {
                this.onclose = onclose;
                this.nodeAd.active = true;
                this.platObj.reportAdShow({adId: retLoad.adId});
                let cb = () => {
                    this.closeAd();
                    xfire.offShow(cb);
                };
                // 华为要求后台返回要关闭插屏广告
                xfire.onShow(cb);
            }
        };
        fn(this.sdkConfig.params.test ? 'testy63txaom86' : this.config.id, false);
    }

    protected nativeHide(): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        this.closeAd();
    }

    private closeAd(): void {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        if (this.nodeAd) {
            this.nodeAd.destroy();
            this.nodeAd = null;
            this.lblDownload = null;
            this.downloadStatus = '';
            if (this.onclose) {
                this.onclose();
                this.onclose = null;
            }
        }
    }

    private createNative(id: string): Promise<boolean> {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        return new Promise<boolean> ((resolve) => {
            if (this.platObj) {
                this.platObj.destroy();
                this.platObj = null;
            }
            this.platObj = huaweiapi.createNativeAd({
                adUnitId: id,
                success: (code: number) => {
                    console.log('createNativeAd: success');
                    resolve(true);
                },
                fail: (data: any, code: number) => {
                    console.log('createNativeAd: fail: ' + data + ',' + code);
                    resolve(false);
                }
            });
            if (!this.platObj) {
                resolve(false);
                return;
            }
            this.platObj.onStatusChanged((ret: {status: string; uniqueId: string}) => {
                if (xfire.plat !== xfire.PLAT_HUAWEI) return;
                if (this.clicked || this.adId !== ret.uniqueId) {
                    return;
                }
                switch (ret.status) {
                    case 'WAITING':
                        this.downloadStatus = '准备下载';
                        if (this.lblDownload) this.lblDownload.string = '准备下载';
                        break;
                    case 'DOWNLOADING':
                        this.downloadStatus = '下载中';
                        if (this.lblDownload) this.lblDownload.string = '下载中 0%';
                        break;
                    case 'DOWNLOADFAILED':
                        this.downloadStatus = '';
                        if (this.lblDownload) this.lblDownload.string = '下载失败';
                        break;
                    case 'INSTALL':
                        this.downloadStatus = '安装中';
                        if (this.lblDownload) this.lblDownload.string = '安装中';
                        break;
                    case 'INSTALLED':
                        this.downloadStatus = '';
                        if (this.lblDownload) this.lblDownload.string = '安装成功';
                        break;
                    default:
                        break;
                }
            });
            this.platObj.onDownloadProgress((data: {progress: number/*0-100*/; uniqueId: string}) => {
                if (this.downloadStatus === '下载中' && this.adId === data.uniqueId) {
                    if (this.lblDownload) this.lblDownload.string = `下载中 ${data.progress}%`;
                }
            });
        });
    }

    private loadNative(): Promise<any> {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        return new Promise<any> ((resolve) => {
            if (this.platObj == null) {
                resolve(null);
                return;
            }
            /**
             * 返回实例
             * {
             *     "adList": [{
             *             "videoUrlList": ["https://cs02-pps-drcn.dbankcdn.com/dl/pps/202004301743314eb854f86bf94389b3a40267c3dc95d1.mp4"],
             *             "videoRatio": [1.7777778],
             *             "imgUrlList": ["https://cs02-pps-drcn.dbankcdn.com/dl/pps/20200725105332993E06F098BAA15E9FDC290386784099.jpg"],
             *             "adId": "b90d7e9b-7f09-4200-9efb-0cd93eea21f9",
             *             "creativeType": 106,
             *             "interactionType": 0,
             *             "source": "HUAWEI",
             *             "title": "HUAWEI Ads Test",
             *             "logoUrl": "",
             *             "clickBtnTxt": "安装"
             *         }
             *     ]
             * }
             */
            this.platObj.onLoad((ret: {adList: any[]}) => {
                console.log('原生广告加载成功：' + this.config.name);
                if (ret.adList != null && ret.adList.length > 0) {
                    this.clickReported = false;
                    this.clicked = false;
                    let adId = ret.adList[0].adId;
                    console.log('id:' + adId);
                    resolve(ret.adList[0]);
                }
                else {
                    resolve(null);
                }
            });
            this.platObj.onError((errCode: number, errMsg: string) => {
                console.log('原生广告加载失败：' + JSON.stringify(errCode) + ' ' + JSON.stringify(errMsg));
                resolve(null);
            });
            this.platObj.load();
        });
    }

    // tslint:disable-next-line: cyclomatic-complexity
    private instantiateAd(ad: any): cc.Node {
        if (xfire.plat !== xfire.PLAT_HUAWEI) return;
        let layerAd = xfire.getLayerNativeAd();
        if (layerAd == null) {
            console.log('异常，不存在原生广告层');
            return null;
        }
        if (this.nodeAd) {
            this.nodeAd.destroy();
            this.nodeAd = null;
            if (this.onclose) {
                this.onclose();
                this.onclose = null;
            }
        }
        this.adId = ad.adId;
        let iData: SNode = {'name': '结点_原生插屏排版', 'size': [720, 1280], 'components': [{'name': 'Widget', 'properties': {'left': 0, 'top': 0, 'right': 0, 'bottom': 0, 'alignMode': null}}, {'name': 'BlockInput'}], 'children': [{'name': '黑底', 'active': false, 'color': '000000', 'opacity': 128, 'size': [720, 1280], 'components': [{'name': 'Sprite', 'properties': {'image': 'bg1x1', 'type': 0, 'sizeMode': 0}}, {'name': 'Widget', 'properties': {'left': 0, 'top': 0, 'right': 0, 'bottom': 0, 'alignMode': null}}]}, {'name': 'root', 'size': [900, 630], 'components': [{'name': 'BlockInput'}], 'children': [{'name': 'bg', 'size': [900, 630], 'components': [{'name': 'Sprite', 'properties': {'image': 'bg1x1', 'type': 0, 'sizeMode': 0}}]}, {'name': '图片', 'pos': [0, 82], 'size': [880, 446], 'components': [{'name': 'Sprite', 'properties': {'image': '', 'type': 0, 'sizeMode': 0}}, {'name': 'Widget', 'properties': {'left': 10, 'top': 10, 'right': 10, 'alignMode': null}}]}, {'name': '标题', 'color': '000000', 'pos': [-423, -220], 'anchor': [0, 0.5], 'size': [500, 70], 'components': [{'name': 'Label', 'properties': {'string': '标题', 'hAlign': 0, 'vAlign': 1, 'fontSize': 70, 'lineHeight': 75, 'overflow': 2, 'cacheMode': 0}}, {'name': 'Widget', 'properties': {'bottom': 60, 'alignMode': null}}]}, {'name': '描述', 'active': false, 'color': '000000', 'pos': [0, -259], 'size': [604, 70], 'components': [{'name': 'Label', 'properties': {'string': '描述', 'hAlign': 1, 'vAlign': 1, 'fontSize': 45, 'lineHeight': 50, 'overflow': 2, 'cacheMode': 0}}]}, {'name': '来源', 'color': '000000', 'pos': [-423, -306], 'anchor': [0, 0], 'size': [800, 50], 'components': [{'name': 'Label', 'properties': {'string': '描述', 'hAlign': 0, 'vAlign': 2, 'fontSize': 32, 'lineHeight': 40, 'overflow': 2, 'cacheMode': 0}}, {'name': 'Widget', 'properties': {'bottom': 9, 'alignMode': null}}]}, {'name': '按钮全面板', 'size': [900, 630], 'components': [{'name': 'Button', 'properties': {'transition': 0, 'normalSprite': 'default_btn_normal'}}, {'name': 'Widget', 'properties': {'left': 0, 'top': 0, 'right': 0, 'bottom': 0, 'alignMode': null}}]}, {'name': '按钮安装', 'pos': [220, -219], 'size': [220, 80], 'components': [{'name': 'Button', 'properties': {'transition': 3, 'zoomScale': 1.2, 'normalSprite': 'default_btn_normal'}}, {'name': 'Widget', 'properties': {'right': 120, 'bottom': 56, 'alignMode': null}}], 'children': [{'name': 'Background', 'color': 'd8163d', 'size': [220, 80], 'components': [{'name': 'Sprite', 'properties': {'image': '圆角矩形', 'type': 1, 'sizeMode': 0, 'slice': [11, 11, 11, 11]}}], 'children': [{'name': 'Label', 'size': [180, 63], 'components': [{'name': 'Label', 'properties': {'string': '点击安装', 'hAlign': 1, 'vAlign': 1, 'fontSize': 45, 'lineHeight': 50, 'overflow': 0, 'cacheMode': 0}}]}]}]}, {'name': '排版按钮关闭', 'pos': [399.8, -216.8], 'components': [{'name': 'Widget', 'properties': {'right': 50.19999999999999, 'bottom': 98.19999999999999, 'alignMode': null}}], 'children': [{'name': '按钮关闭', 'pos': [-1.0658141036401503e-14, 1.0658141036401503e-14], 'size': [32, 32], 'scale': [0.7, 0.7], 'components': [{'name': 'Button', 'properties': {'transition': 0, 'normalSprite': 'x3'}}], 'children': [{'name': 'Background', 'size': [90, 90], 'components': [{'name': 'Sprite', 'properties': {'image': 'x3', 'type': 0, 'sizeMode': 0}}]}]}]}, {'name': '广告标记', 'color': '000000', 'pos': [451, -316], 'anchor': [1, 0], 'size': [65, 34], 'scale': [1.5, 1.5], 'components': [{'name': 'Sprite', 'properties': {'image': '广告标记', 'type': 0, 'sizeMode': 1}}, {'name': 'Widget', 'properties': {'right': -1, 'bottom': -1, 'alignMode': null}}]}]}]};

        let node = SimpleUI.instantiate(iData, XFireAppHuawei.resLoader);
        // 是否模拟插屏，不模拟插屏就不能屏蔽触摸
        if (!this.simInterstitial) {
            let block = node.getComponent(cc.BlockInputEvents);
            if (block) {
                block.enabled = false;
            }
        }
        node.active = false;
        node.parent = layerAd;
        node.x = cc.view.getVisibleSize().width / 2;
        node.y = cc.view.getVisibleSize().height / 2;
        this.nodeAd = node;
        // 取出一些关键点
        let root = node.getChildByName('root');
        // 缩放
        if (this.simInterstitial) {
            if (cc.view.getVisibleSize().height > cc.view.getVisibleSize().width) {
                root.scale = cc.view.getVisibleSize().width / 1080;
            }
            else {
                root.scale = cc.view.getVisibleSize().height / 900;
            }
        }
        else {
            let style = this.config.style;
            let containerWidth = style.width;
            let containerHeight = style.height;
            let scale = Math.min(containerWidth / 900, containerHeight / 630);
            root.scale = scale;
            root.setPosition(-cc.view.getVisibleSize().width / 2 + style.left + style.width / 2,
                cc.view.getVisibleSize().height / 2 - style.top - style.height / 2
            );
        }
        // 标题
        {
            let nodeTitle = cc.find('root/标题', node);
            if (nodeTitle) {
                let lbl = nodeTitle.getComponent(cc.Label);
                if (lbl) {
                    lbl.string = ad.title || '';
                }
            }
        }
        // 来源
        {
            let nodeTitle = cc.find('root/来源', node);
            if (nodeTitle) {
                let lbl = nodeTitle.getComponent(cc.Label);
                if (lbl) {
                    lbl.string = ad.source || '';
                }
            }
        }
        // 描述
        {
            let nodeDesc = cc.find('root/描述', node);
            if (nodeDesc) {
                let lbl = nodeDesc.getComponent(cc.Label);
                if (lbl) {
                    lbl.string = '';
                }
            }
        }
        // 图片
        {
            let nodeImg = cc.find('root/图片', node);
            if (nodeImg) {
                let sprite = nodeImg.getComponent(cc.Sprite);
                if (sprite) {
                    let url = ad.imgUrlList[0];
                    cc.loader.load(url, (err, tex) => {
                        let frame = new cc.SpriteFrame();
                        if (tex instanceof cc.Texture2D && err == null) {
                            frame.setTexture(tex);
                        }
                        sprite.spriteFrame = frame;
                    });
                }
            }
        }
        // 关闭按钮
        XFireAppHuawei.bindButtonClickListener(cc.find('root/排版按钮关闭/按钮关闭', node), () => {
            this.closeAd();
        });
        // 关闭按钮动态变化位置
        while (this.cuteClose) {
            let nodeClose = cc.find('root/排版按钮关闭', node);
            if (!nodeClose) break;

            let widget = nodeClose.getComponent(cc.Widget);
            if (!widget) break;

            let leftTop = (FeedsAdHuaWei.cuteCloseTick & 1) === 0;
            let rightTop = (FeedsAdHuaWei.cuteCloseTick & 1) === 1;
            widget.isAlignBottom = false;
            widget.isAlignTop = true;
            widget.isAlignLeft = leftTop;
            widget.isAlignRight = rightTop;
            widget.top = 50;
            widget.left = 50;
            widget.right = 50;
            widget.updateAlignment();
            FeedsAdHuaWei.cuteCloseTick++;
            break;
        }
        // 关闭按钮调节触摸大小
        {
            let scale = (xfire as XFireAppHuawei).feedsCloseButtonScale;
            if (this.sdkConfig.params && typeof this.sdkConfig.params.feedsCloseScale === 'number') scale *= this.sdkConfig.params.feedsCloseScale;
            let nodeClose = cc.find('root/排版按钮关闭/按钮关闭', node);
            if (nodeClose) {
                nodeClose.width *= scale;
                nodeClose.height *= scale;
            }
        }
        // 下载按钮
        {
            let nodeLabel = cc.find('root/按钮安装/Background/Label', node);
            if (nodeLabel) {
                this.lblDownload = nodeLabel.getComponent(cc.Label);
                if (this.lblDownload) {
                    this.lblDownload.string = ad.clickBtnTxt;
                }
            }
            let bindListener = (nodeButton: cc.Node) => {
                XFireAppHuawei.bindButtonClickListener(nodeButton, () => {
                    if (!this.platObj) return;
                    this.clicked = true;
                    if (!this.clickReported) {
                        this.clickReported = true;
                        console.log('上报点击');
                        /** 上报会拉起落地页 */
                        this.platObj.reportAdClick({adId: this.adId});
                    }
                    // 是否自动开始下载，如果应用已经安装，则会唤醒应用
                    if ((xfire as XFireAppHuawei).feedsAutoDownload) {
                        this.platObj.startDownload({adId: this.adId});
                    }
                });
            };
            let nodeButton = cc.find('root/按钮安装', node);
            bindListener(nodeButton);
            let nodePanel = cc.find('root/按钮全面板', node);
            bindListener(nodePanel);
        }
        return node;
    }
}
