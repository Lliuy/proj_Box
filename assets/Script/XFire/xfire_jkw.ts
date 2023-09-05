/**
 * 即刻玩小游戏
 * 接口文档地址https://gamebox.gitbook.io/project/
 * 平台特性：
 *
 * 打包方法：
 *      1.发布为即刻玩，会在build/jkw-game下生成cpk文件。
 *
 * 测试方法：
 *      1.下载安装测试环境apk，https://gamebox.gitbook.io/project/you-xi-jie-ru-wen-dang/zi-ce-gong-ju
 *      2.装好后打开点击左上角进行游戏配置
 *          gameId：游戏id
 *          gameType：一般选择非对战
 *          gameMode：一般选择Runtime
 *          loadType：一般选择文件，Url也可以（部署到内网站点）
 *              如果选择文件，那么将打包出来的cpk文件放置到手机的/jeekegame/下
 *      3.更新版本点下【清除游戏】再点击【启动游戏】，防止旧缓存导致没更新
 *      4.如果卡在初始化游戏环境，清理下【自测工具】的缓存
 *
 * 平台问题：
 *
 */

import XFireApp, { AdCfg, AppBoxAd, AppConfig, BannerAd, InterstitialAd, SdkCfg, ShareInfo, SystemInfo, VideoAd, XUserInfoButton, XUserInfoWithSignature } from './xfire_base';
import XFireConfigs from './xfire_config';

// 即刻玩的接口
if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.JKW_GAME && (typeof XH_PLAT === 'undefined' || XH_PLAT === 'jkw')) {
    let GameSDK = (window as any).GameSDK = {
        initCallBack: null,
        userInfo: null,
        callBacks: {},      // CallBack
        // Internal -- Call Native
        callNative (cmd, param) {
            let lparam = param == null ? '' : JSON.stringify(param);
            let rt = (window as any).loadRuntime();
            rt.callCustomCommand({
                success(msg) {
                  // console.log('success:', msg);
                },
                fail(msg) {
                  // console.log('fail:', msg);
                }
            }, cmd, lparam);
        },

        nativeCallback (cmd, param) {
            let func = GameSDK.callBacks[cmd];
            if (func) {
                func(JSON.parse(param));
            }
        },

        registerCallback (cmd, func) {
            GameSDK.callBacks[cmd] = func;
        },

        // 设置回调函数
        setOnInitCB (func) {
            GameSDK.registerCallback('onInit', func);
        },

        setOnRoomInfoCB (func) {
            GameSDK.registerCallback('onRoomInfo', func);
        },

        setOnReadyCB (func) {
            GameSDK.registerCallback('onReady', func);
        },

        setOnStartCB (func) {
            GameSDK.registerCallback('onStart', func);
        },

        setOnMessageCB (func) {
            GameSDK.registerCallback('onMessage', func);
        },

        setOnFinishCB (func) {
            GameSDK.registerCallback('onFinish', func);
        },

        setOnAudioCB (func) {
            GameSDK.registerCallback('onAudio', func);
        },

        setOnResumeCB (func) {
            GameSDK.registerCallback('onResume', func);
        },

        setOnPauseCB (func) {
            GameSDK.registerCallback('onPause', func);
        },

        setOnPayCB(func) {
            GameSDK.registerCallback('onPay', func);
        },

        // 初始化SDK
        // 参数:
        //   gameId: int 游戏ID
        init (gameId, cb) {
            GameSDK.initCallBack = cb;
            let param = {
                'gameId': gameId
            };
            GameSDK.callNative('init', param);
        },

        // 退出游戏
        // 参数:
        //   reason: int 退出原因: 1 - 正常退出，2-异常退出
        quit (reason) {
            let param = {
                'reason': reason
            };
            GameSDK.callNative('quit', param);
        },


        // 获取游戏房间信息
        getRoomInfo () {
            GameSDK.callNative('getRoomInfo', null);
        },

        // 游戏终止
        // 参数:
        //   result: int 游戏结果: 1、胜，2、负，3、平
        finish (result) {
            let param = {
                result
            };
            GameSDK.callNative('finish', param);
        },

        // 设置屏幕朝向
        // 参数:
        //    orientation: int 屏幕朝向: 0、横屏，1、竖屏
        setOrientation (orientation) {
            let param = {
                orientation
            };
            GameSDK.callNative('setOrientation', param);
        },

        // 设置声音
        // 参数:
        //   enable: int 是否开启: 0、关闭，1、开启
        //   volume: int 音量
        setAudio (enable, volume) {
            let param = {
                enable,
                volume
            };
            GameSDK.callNative('setAudio', param);
        },

        // 设置麦克风
        // 参数:
        //   enable: int 是否开启: 0、关闭，1、开启
        //   volume: int 音量: 0 ~ 100
        setMic (enable, volume) {
            let param = {
                enable,
                volume
            };
            GameSDK.callNative('setMic', param);
        },

        // 设置游戏加载进度（SDK版本 >= 2）
        // 参数:
        //    progress: int 加载进度: 0 ~ 100
        // 说明: 从SDK版本2开始，平台增加了统一的游戏加载进度界面，用于游戏后台加载时显示。
        //      游戏需要在初始化后，通过此函数报告游戏加载进度。加载界面将显示“加载中...”
        //      当进度>=100%时，加载界面并不会关闭，加载界面将提醒用户“等待对手进入中...”
        //      因此，游戏需要在对手都进入房间后，调用hideLoadProgress函数关闭加载界面。
        setLoadProgress (progress) {
            let param = {
                progress
            };
            GameSDK.callNative('setLoadProgress', param);
        },

        // 隐藏游戏加载进度（SDK版本 >= 2）
        // 参数:
        //    无
        // 说明: 用于关闭加载进度界面。此后玩家才可以和游戏交互。
        hideLoadProgress () {
            let param = {};
            GameSDK.callNative('hideLoadProgress', param);
        },

        // 游戏准备
        // 参数
        //   userData: string 用户数据
        ready (userData) {
            let param = {
                userData
            };
            GameSDK.callNative('ready', param);
        },

        // 游戏消息广播
        // 参数
        //  message: string 广播的消息
        //  includeMe: int 是否也广播给自己: 0、不包含，1、包含
        broadcast (message, includeMe) {
            let lIncludeMe = includeMe;
            if (lIncludeMe == null) {
                lIncludeMe = 0;
            }
            let param = {
                'message': message,
                'includeMe': lIncludeMe
            };
            GameSDK.callNative('broadcast', param);
        },

        // 游戏结束
        // 参数
        //   result: int 游戏结果: 1、胜，2、负，3、平
        gameOver (result) {
            let param = {
                result
            };
            GameSDK.callNative('gameOver', param);
        },

        // 游戏支付
        // 参数
        //   orderId: int 订单号
        //   goodsName: string 商品名称
        //   goodsDesc: string 商品描述
        //   orderAmount: int 订单金额
        //   extension： string 透传参数
        //   notifyURL: string 支付付款通知地址
        pay (orderId, goodsName, goodsDesc, orderAmount, extension, notifyURL) {
            let param = {
                'orderId': orderId,
                'goodsName': goodsName,
                'goodsDesc': goodsDesc,
                'orderAmount': orderAmount,
                'extension': extension,
                'notifyURL': notifyURL
            };
            GameSDK.callNative('pay', param);
        }
    };
    GameSDK.setOnInitCB((params) => {
        if (params.error !== 0) {
            console.log('即刻玩初始化错误：' + params.error);
            return;
        }
        else {
            console.log('即刻玩初始化完成');
        }
        GameSDK.userInfo = {};
        GameSDK.userInfo.userId = params.userId;
        GameSDK.userInfo.nickName = params.nickName;
        GameSDK.userInfo.headUrl = params.headUrl;
        GameSDK.userInfo.location = params.location;
        GameSDK.userInfo.sex = params.sex;
        GameSDK.userInfo.age = params.age;
        if (GameSDK.initCallBack) {
            GameSDK.initCallBack();
        }
    });

    let GameAdSdk = (window as any).GameAdSdk = {
        initCallBack: null,
        bannerAds: {},
        interstitialAds: {},
        videoAds: {},
        init (cb) {
            GameAdSdk.initCallBack = cb;

            GameSDK.registerCallback('ad_banner_onLoad', (param) => {
                let banner = GameAdSdk.bannerAds[param.adId];
                if (banner && banner.onLoad) {
                    banner.onLoad(param);
                }
            });
            GameSDK.registerCallback('ad_banner_onError', (param) => {
                let banner = GameAdSdk.bannerAds[param.adId];
                if (banner && banner.onError) {
                    banner.onError(param);
                }
            });
            GameSDK.registerCallback('ad_banner_onResize', (param) => {
                let banner = GameAdSdk.bannerAds[param.adId];
                if (banner && banner.onResize) {
                    banner.onResize(param);
                }
            });
            GameSDK.registerCallback('ad_interstitial_onLoad', (param) => {
                let interstitialAd = GameAdSdk.interstitialAds[param.adId];
                if (interstitialAd && interstitialAd.onLoad) {
                    interstitialAd.onLoad(param);
                }
            });
            GameSDK.registerCallback('ad_interstitial_onError', (param) => {
                let interstitialAd = GameAdSdk.interstitialAds[param.adId];
                if (interstitialAd && interstitialAd.onError) {
                    interstitialAd.onError(param);
                }
            });
            GameSDK.registerCallback('ad_interstitial_onResize', (param) => {
                let interstitialAd = GameAdSdk.interstitialAds[param.adId];
                if (interstitialAd && interstitialAd.onResize) {
                    interstitialAd.onResize(param);
                }
            });
            GameSDK.registerCallback('ad_rewardedVideo_onLoad', (param) => {
                let videoAd = GameAdSdk.videoAds[param.adId];
                if (videoAd && videoAd.onLoad) {
                    videoAd.onLoad(param);
                }
            });
            GameSDK.registerCallback('ad_rewardedVideo_onError', (param) => {
                let videoAd = GameAdSdk.videoAds[param.adId];
                if (videoAd && videoAd.onError) {
                    videoAd.onError(param);
                }
            });
            GameSDK.registerCallback('ad_rewardedVideo_onClose', (param) => {
                let videoAd = GameAdSdk.videoAds[param.adId];
                if (videoAd && videoAd.onclose) {
                    videoAd.onclose(param);
                }
            });
            GameSDK.registerCallback('ad_onShow', (param) => {
                console.log('ad_onShow:' + JSON.stringify(param));
                let type = parseInt(param.type, 10);
                if (type === 1) {
                    let banner = GameAdSdk.bannerAds[param.adId];
                    if (banner && banner.mHandler) {
                        banner.mHandler(param.success);
                    }
                }
                else if (type === 2) {
                    let interstitialAd = GameAdSdk.interstitialAds[param.adId];
                    if (interstitialAd && interstitialAd.mHandler) {
                        interstitialAd.mHandler(param.success);
                    }
                }
                else if (type === 3) {
                    let videoAd = GameAdSdk.videoAds[param.adId];
                    if (videoAd && videoAd.mHandler) {
                        videoAd.mHandler(param.success);
                    }
                }
            });
        },
        // 创建Banner广告
        // 参数
        //   adId: string 广告序号ID
        //   bannerAdId: string Banner广告ID
        //   position: int 广告位置 1 屏幕顶部 2 屏幕底部 3屏幕中间
        createBannerAd (adId, bannerAdId, position) {
            let bannerAd: any = {'adId': adId};
            let param = {
                'adId': adId,
                'bannerAdId': bannerAdId,
                'position': position
            };
            GameSDK.callNative('ad_banner_create', param);

            // 显示 banner 广告
            bannerAd.show = () => {
                let param = {
                    'adId': adId
                };
                GameSDK.callNative('ad_banner_show', param);
                let promise = new Promise((resolve, reject) => {
                    let handler = (params) => {
                        if (parseInt(params, 10) === 0) {
                            resolve();
                        } else {
                            reject();
                        }
                    };
                    GameAdSdk.bannerAds[adId].mHandler = handler;
                });
                return promise;
            };
            // 隐藏 banner 广告
            bannerAd.hide = () => {
                let param = {
                    'adId': adId
                };
                GameSDK.callNative('ad_banner_hide', param);
            };

            // 销毁 banner 广告
            bannerAd.destroy = () => {
                let param = {
                    'adId': adId
                };
                GameAdSdk.bannerAds[adId] = null;
                GameSDK.callNative('ad_banner_destroy', param);
            };

            // 监听 banner 广告加载事件
            bannerAd.onLoad = (cb) => {
                bannerAd.onLoad = cb;
            };

            // 监听 banner 广告错误事件
            bannerAd.onError = (cb) => {
                bannerAd.onError = cb;
            };

            // 监听 banner 广告尺寸变化事件  未实现
            bannerAd.onResize = (cb) => {
                bannerAd.onResize = cb;
            };

            // 取消监听 banner 广告加载事件
            bannerAd.offLoad = (cb) => {
                if (bannerAd.onLoad === cb) {
                    bannerAd.onLoad = null;
                }
            };

            // 取消监听 banner 广告错误事件
            bannerAd.offError = (cb) => {
                if (bannerAd.onError === cb) {
                    bannerAd.onError = null;
                }
            };

            // 取消监听 banner 广告尺寸变化事件
            bannerAd.offResize = (cb) => {
                if (bannerAd.onResize === cb) {
                    bannerAd.onResize = null;
                }
            };
            GameAdSdk.bannerAds[adId] = bannerAd;
            return bannerAd;
        },
        // 创建插屏广告
        // 参数
        //   adId: string 广告序号ID
        //   interstitialAdId: string 插屏广告ID
        //   style: int 广告类型 1 全屏 2 半屏
        createInterstitialAd (adId, interstitialAdId, style) {
            let interstitialAd: any = {'adId': adId};
            let param = {
                'adId': adId,
                'interstitialAdId': interstitialAdId,
                'style': style
            };
            GameSDK.callNative('ad_interstitial_create', param);

            // 显示 插屏 广告
            interstitialAd.show = () => {
                let param = {
                    'adId': adId
                };
                GameSDK.callNative('ad_interstitial_show', param);
                let promise = new Promise((resolve, reject) => {
                    let handler = (params) => {
                        if (parseInt(params, 10) === 0) {
                            resolve();
                        } else {
                            reject();
                        }
                    };
                    GameAdSdk.interstitialAds[adId].mHandler = handler;
                });
                return promise;
            };

            // 隐藏 插屏 广告
            interstitialAd.hide = () => {
                let param = {
                    'adId': adId
                };
                GameSDK.callNative('ad_interstitial_hide', param);
            };

            // 销毁 插屏 广告
            interstitialAd.destroy = () => {
                let param = {
                    'adId': adId
                };
                GameAdSdk.interstitialAds[adId] = null;
                GameSDK.callNative('ad_interstitial_destroy', param);
            };

            // 监听 插屏 广告加载事件
            interstitialAd.onLoad = (cb) => {
                interstitialAd.onLoad = cb;
            };

            // 监听 插屏 广告错误事件
            interstitialAd.onError = (cb) => {
                interstitialAd.onError = cb;
            };
            // 监听 插屏 广告尺寸变化事件
            interstitialAd.onResize = (cb) => {
                interstitialAd.onResize = cb;
            };

            // 取消监听 插屏 广告加载事件
            interstitialAd.offLoad = (cb) => {
                if (interstitialAd.onLoad === cb) {
                    interstitialAd.onLoad = null;
                }
            };

            // 取消监听 插屏 广告错误事件
            interstitialAd.offError = (cb) => {
                if (interstitialAd.onError === cb) {
                    interstitialAd.onError = null;
                }
            };

            // 取消监听 插屏 广告尺寸变化事件
            interstitialAd.offResize = (cb) => {
                if (interstitialAd.onResize === cb) {
                    interstitialAd.onResize = null;
                }
            };
            GameAdSdk.interstitialAds[adId] = interstitialAd;
            return interstitialAd;
        },
        // 创建激励视频广告
        // 参数
        //   videoAdId: string 视频广告ID
        //   screenOrientation: int 广告类型 1 横屏 2 竖屏
        createRewardedVideoAd (adId, videoAdId, screenOrientation) {
            let rewardedVideoAd: any = {'adId': adId};
            let param = {
                'adId': adId,
                'videoAdId': videoAdId,
                'screenOrientation': screenOrientation
            };
            GameSDK.callNative('ad_rewardedVideo_create', param);

            // 显示激励视频广告
            rewardedVideoAd.show = () => {
                let param = {
                    'adId': adId
                };
                GameSDK.callNative('ad_rewardedVideo_show', param);
                let promise = new Promise((resolve, reject) => {
                    let handler = (params) => {
                        if (parseInt(params, 10) === 0) {
                            resolve();
                        } else {
                            reject();
                        }
                    };
                    GameAdSdk.videoAds[adId].mHandler = handler;
                });
                return promise;
            };

            // 隐藏激励视频广告
            rewardedVideoAd.hide = () => {
                let param = {
                    'adId': adId
                };
                GameSDK.callNative('ad_rewardedVideo_hide', param);
            };

            // 销毁激励视频广告
            rewardedVideoAd.destroy = () => {
                let param = {
                    'adId': adId
                };
                GameAdSdk.videoAds[adId] = null;
                GameSDK.callNative('ad_rewardedVideo_destroy', param);
            };

            // 监听激励视频广告加载事件
            rewardedVideoAd.onLoad = (cb) => {
                rewardedVideoAd.onLoad = cb;
            };

            // 监听激励视频错误事件
            rewardedVideoAd.onError = (cb) => {
                rewardedVideoAd.onError = cb;
            };

            // 监听用户点击 关闭广告 按钮的事件
            rewardedVideoAd.onClose = (cb) => {
                rewardedVideoAd.onclose = cb;
            };

            // 监听激励视频广告加载事件
            rewardedVideoAd.offLoad = (cb) => {
                if (rewardedVideoAd.onLoad === cb) {
                    rewardedVideoAd.onLoad = null;
                }
            };

            // 监听激励视频错误事件
            rewardedVideoAd.offError = (cb) => {
                if (rewardedVideoAd.onError === cb) {
                    rewardedVideoAd.onError = null;
                }
            };

            // 监听用户点击 关闭广告 按钮的事件
            rewardedVideoAd.offClose = (cb) => {
                if (rewardedVideoAd.onclose === cb) {
                    rewardedVideoAd.onclose = null;
                }
            };
            GameAdSdk.videoAds[adId] = rewardedVideoAd;
            return rewardedVideoAd;
        }
    };
}

/**
 * ##############################################################################################
 * ##############################################################################################
 * ##############################################################################################
 */

// 基础能力接口
const jkwrt: any = cc.sys.platform === cc.sys.JKW_GAME ? (window as any).loadRuntime() : null;
// 封装后的sdk能力接口
const jkwapi: any = (window as any).GameSDK;
let jkwSystemInfo = null;
// 广告sdk
const jkwadapi: any = (window as any).GameAdSdk;

if (jkwrt) {
    jkwrt.getSystemInfo({
        success: (res) => {
            jkwSystemInfo = res;
        }
    });
}

export default class XFireAppJKW extends XFireApp{
    private static validateNativeUserInfoResult(res: any): XUserInfoWithSignature {
        if (!jkwapi.userInfo) {
            return null;
        }
        let userInfo = jkwapi.userInfo;
        let nickname = userInfo.nickName;
        let avatar = userInfo.headUrl;
        let gender = '';
        switch (userInfo.geder) {
            case 1: gender = '男'; break;
            case 2: gender = '女'; break;
        }
        let signature: any = {};
        return new XUserInfoWithSignature(nickname, avatar, gender, signature);
    }

    public constructor() {
        super();
        this.logined = true;
        this.plat = this.PLAT_JKW;
        this.supportGuestLogin = false;
    }

    public getAdSdkName(): string {
        return '即刻玩小程序';
    }

    public supportVibrate(): boolean {
        return true;
    }

    public vibrateShort() {
        jkwrt.vibrateShort();
    }

    public vibrateLong() {
        jkwrt.vibrateLong();
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

    public getUserInfo(params?: {
        success?: (info: XUserInfoWithSignature) => void;
        fail?: (err: string) => void;
        complete?: () => void;
    }): Promise<{
        userInfo?: XUserInfoWithSignature;
        error?: string;
    }> {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new Promise<{
            userInfo?: XUserInfoWithSignature;
            error?: string;
        }>((resolve) => {
            if (cc.sys.platform === cc.sys.WECHAT_GAME) {
                return;
            }
            let lParams = params || {};
            let userInfo = XFireAppJKW.validateNativeUserInfoResult(null);
            if (userInfo) {
                if (params.success) {
                    lParams.success(userInfo);
                }
            }
            else {
                if (lParams.fail) {
                    lParams.fail('');
                }
            }
            if (lParams.complete) {
                lParams.complete();
            }
            resolve({userInfo});
        });
    }

    public exit() {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        jkwapi.quit(1);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        let info = jkwSystemInfo;
        if (jkwrt.getSystemInfoSync) {
            info = jkwrt.getSystemInfoSync();
        }
        if (info == null) {
            return {
                brand: '',
                model: '',
                pixelRatio: 1,
                screenWidth: cc.view.getVisibleSize().width,
                screenHeight: cc.view.getVisibleSize().height,
                windowWidth: cc.view.getVisibleSize().width,
                windowHeight: cc.view.getVisibleSize().height,
                language: ''
            };
        }
        return {
            brand: info.brand || '',
            model: info.model || '',
            pixelRatio: info.pixelRatio,
            screenWidth: info.screenWidth,
            screenHeight: info.screenHeight,
            windowWidth: info.windowWidth,
            windowHeight: info.windowHeight,
            language: info.language
        };
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new BannerAdJKW(sdkConfig, cfg);
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new VideoAdJKW(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        return new InterstitialAdJKW(sdkConfig, cfg);
    }

    protected init(config: AppConfig, createAdvertisements = true) {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        super.init(config, false);
        jkwapi.init(config.appid, () => {
            setTimeout(() => {
                jkwadapi.init();
                this.createAdvertisements();
            }, 0);
        });
    }

}

class BannerAdJKW extends BannerAd{
    // 广告创建监视
    private monitor = false;

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

        if (!this.monitor) {
            this.monitor = true;
            (async () => {
                while (true) {
                    await xfire.sleep(1);
                    if (this.enable) continue;
                    await xfire.sleep(XFireConfigs.即刻广告加载重试间隔);

                    if (this.platObj) {
                        this.platObj.destroy();
                        this.platObj = null;
                    }
                    this.load();
                }
            })();
        }

        let banner = jkwadapi.createBannerAd(this.config.name, this.config.id, 2);
        this.platObj = banner;
        if (banner == null) {
            console.log('创建banner失败：' + this.config.name);
        }
        else {
            console.log('创建banner成功');
            banner.onLoad(() => {
                console.log('banner广告加载成功：' + this.config.name);
                this.enable = true;
                if (this.toShow) {
                    this.show();
                }
            });
            banner.onError((err: any) => {
                console.log('banner广告加载失败：' + this.config.name + ' 错误：' + JSON.stringify(err));
                this.enable = false;
            });
        }
    }

    public destroy(): void {
    }

    protected nativeShow(): void {
        if (this.platObj != null) {
            this.platObj.show();
        }
    }

    protected nativeHide(): void {
        if (this.platObj != null) {
            this.platObj.hide();
        }
    }
}

class VideoAdJKW extends VideoAd{
    private end = false;
    // 广告创建监视
    private monitor = false;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }

        if (!this.monitor) {
            this.monitor = true;
            (async () => {
                while (true) {
                    await xfire.sleep(1);
                    if (this.enable) continue;
                    await xfire.sleep(XFireConfigs.即刻广告加载重试间隔);

                    if (this.platObj) {
                        this.platObj.destroy();
                        this.platObj = null;
                    }
                    this.load();
                }
            })();
        }

        let video = jkwadapi.createRewardedVideoAd(this.config.name, this.config.id, cc.view.getVisibleSize().width > cc.view.getVisibleSize().height ? 1 : 2);
        this.platObj = video;
        if (video == null) {
            console.log('创建video失败');
        }
        else {
            console.log('创建video成功');
            video.onLoad(() => {
                this.enable = true;
                console.log('视频广告加载成功：' + this.config.name);
            });
            video.onError((err: any) => {
                this.enable = false;
                console.error('视频广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
            });
        }
    }

    public destroy(): void {
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            let rcb = (res: any) => {
                cc.game.emit(cc.game.EVENT_SHOW);
                this.enable = false;
                // 监视器会自动重新加载
                if (cb) {
                    cb(this.end);
                }
            };
            this.platObj.onClose(rcb);
            this.end = false;
            this.platObj.show().then(() => {
                console.log('视频广告展示成功：' + this.config.name);
                this.end = true;
                cc.game.emit(cc.game.EVENT_HIDE);
            }, (err) => {
                console.log('视频广告展示失败：' + this.config.name + ' 错误:' + JSON.stringify(err));
                // 监视器会自动重新加载
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

class InterstitialAdJKW extends InterstitialAd {
    // 广告创建监视
    private monitor = false;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }

        if (!this.monitor) {
            this.monitor = true;
            (async () => {
                while (true) {
                    await xfire.sleep(1);
                    if (this.enable) continue;
                    await xfire.sleep(XFireConfigs.即刻广告加载重试间隔);

                    if (this.platObj) {
                        this.platObj.destroy();
                        this.platObj = null;
                    }
                    this.load();
                }
            })();
        }

        let ad = jkwadapi.createInterstitialAd(this.config.name, this.config.id, 2);
        if (ad != null) {
            console.log('创建插屏成功');
            this.platObj = ad;
            ad.onError((err: any) => {
                this.enable = false;
                console.error('插屏广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
            });
            ad.onLoad(() => {
                console.log('插屏广告加载成功：' + this.config.name);
                this.enable = true;
            });
        }
        else {
            console.log('创建插屏失败');
            this.platObj = null;
            this.enable = false;
        }
    }

    public destroy(): void {
    }

    public update(dt: number, idleTime: number): void {
    }

    protected nativeShow(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.show()
                .then(() => {
                    this.platObj.destroy();
                    this.enable = false;
                    this.load();
                }).catch((err) => {
                    console.log(err);
                });
        }
    }
}
