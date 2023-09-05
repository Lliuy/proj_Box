/*******************************************************************************
文件: xfire_snowflake.ts
创建: 2020年8月19日
作者: 老张(zwx@xfire.mobi)
描述:
    瑞狮雪花小游戏
    文档地址：http://wiki.vlion.cn/pages/viewpage.action?pageId=22577610  账号：game_cp 密码：123456

打包方法：
    1.安装最新的打包插件1.6.0及以上
    2.xhappcfg里配置好【雪花小程序】
    2.打包选择web-mobile平台，成功会生成snowflake文件夹

测试方法：
    1.手机安装"Z:\软件\平台接入工具\雪花游戏测试.apk"
    2.上传服务器 g/[游戏编号]/h5/snowflake/v[版本号]/test
    3.电脑浏览器访问https://h5.orbn.top/g/[游戏编号]/h5/snowflake/v[版本号]/test确保可行
    4.打开手机测试工具
    5.地址栏输入https://h5.orbn.top/g/[游戏编号]/h5/snowflake/v[版本号]/test

发布方法：
    1.测试完成后将游戏上传服务器g/[游戏编号]/h5/snowflake/v[版本号]/ol
    2.将游戏链接https://h5.orbn.top/g/[游戏编号]/h5/snowflake/v[版本号]/ol发送给对方
*******************************************************************************/

import XFireApp, { AdCfg, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd } from './xfire_base';

const win: any = window;
const sfapi = win.vlion_Game_Sdk;
const sfcbapi = win.VLION_JSSDK_EVENT;

export default class XFireAppSnowFlake extends XFireApp{
    public constructor() {
        super();
        this.plat = this.PLAT_SNOWFLAKE;
        this.supportGuestLogin = false;
    }

    public getAdSdkName(): string {
        return '雪花小程序';
    }

    public supportLogin(): boolean {
        return false;
    }

    public supportVideoAd(): boolean {
        return true;
    }

    public supportInterstitialAd(): boolean {
        return true;
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_SNOWFLAKE) {
            return;
        }
        return new VideoAdSnowFlake(sdkConfig, cfg);
    }

    public createInterstitialAd(sdkConfig: SdkCfg, cfg: AdCfg): InterstitialAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_SNOWFLAKE) {
            return;
        }
        return new InterstitialAdSnowFlake(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_SNOWFLAKE) {
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
            language: (win.navigator != null && win.navigator.language != null) ? win.navigator.language : 'zh_CN'
        };
    }

}

class VideoAdSnowFlake extends VideoAd{
    /** 标记是否播放完了 */
    private playEnd = false;
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_SNOWFLAKE) {
            return;
        }
        this.platObj = {};
        sfcbapi.onCPLoadVideo(() => {
            this.enable = true;
        });
        sfcbapi.onCPVideoRequestFailed(() => {
            console.log('加载视频广告失败');
            this.enable = false;
            setTimeout(() => {
                if (!this.enable) {
                    sfapi.getIncentiveVideo();
                }
            }, 30000);
            // 游戏开发者处理游戏内部逻辑
        });
        sfcbapi.onCPRewardVerify(() => {
            this.playEnd = true;
        });
        sfcbapi.onCPVideoClosed(() => {
            cc.game.emit(cc.game.EVENT_SHOW);
            if (this.playCb) {
                this.playCb(this.playEnd);
            }
            this.enable = false;
            sfapi.getIncentiveVideo();
        });
        sfapi.getIncentiveVideo();
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_SNOWFLAKE) {
            return;
        }
        cc.game.emit(cc.game.EVENT_HIDE);
        this.playCb = cb;
        sfapi.showIncentiveVideo();
    }
}

class InterstitialAdSnowFlake extends InterstitialAd {
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
        sfapi.getSpot();
    }
}
