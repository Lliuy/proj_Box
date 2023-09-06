/*******************************************************************************
文件: xfire_kuaishou.ts
创建: 2021年07月26日
作者: 老张(zwx@xfire.mobi)
描述:
    快手小程序，2021年7月26日更新了，以前是打成h5版本，现在快手有开发工具了。

文档：
    开发指南目录：https://gitee.com/kminigame/kwaigame-docv2/tree/master
    API：https://gitee.com/kminigame/kwaigame-docv2/blob/master/api/api.md
    开发工具下载：https://gitee.com/kminigame/kwaigame-docv2/blob/master/start/devtool.md
        安装过程要选择为所有用户安装

特性：
    整个小游戏所有分包大小总和不超过 30M
    单个分包不限制大小，主包不超过 6M

打包测试方法：
    1.安装最新打包插件1.11.0
    2.发布为微信小游戏，会在build目录下生成kuaishou文件夹
    3.用快手开发工具（"Z:\软件\平台接入工具\快手小游戏开发者工具 Setup 1.3.1.exe"）打开工程
    4.工程导入并打开后，确保工具右侧开启【设置】-》【本地配置】-》【自动适配微信小游戏】
    5.点击真机预览，如果失败多尝试几次，出现二维码后，用快手扫码即可（快手账号要配置到后台，至少需要调试权限）

*******************************************************************************/

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
 */

import XFireApp, { AdCfg, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd } from './xfire_base';

const ksapi: any = (window as any).ks;

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

    public supportVibrate(): boolean {
        return true;
    }

    public vibrateShort() {
        ksapi.vibrateShort();
    }

    public vibrateLong() {
        ksapi.vibrateLong();
    }

    public supportVideoAd(): boolean {
        return true;
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }
        return new VideoAdKuaiShou(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }
        let info = ksapi.getSystemInfoSync();
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

class VideoAdKuaiShou extends VideoAd{
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }
        let param = { adUnitId: this.config.id };
        let video = ksapi.createRewardedVideoAd(param);
        this.platObj = video;
        if (video == null) {
            console.log('创建video失败');
        }
        else {
            console.log('创建video成功');
            this.enable = true;
            video.onLoad(() => {
                console.log('视频广告加载成功：' + this.config.name);
            });
            video.onError((err: any) => {
                this.enable = false;
                console.error('视频广告加载错误：' + this.config.name + ' 错误：' + JSON.stringify(err));
            });
        }
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (xfire.plat !== xfire.PLAT_KUAISHOU) {
            return;
        }

        this.playCb = cb;
        if (this.platObj == null) {
            if (cb) cb(false);
            return;
        }

        let rcb = (res: any) => {
            cc.game.emit(cc.game.EVENT_SHOW);
            this.platObj.offClose(rcb);
            if (cb) {
                cb(res.isEnded === true);
            }
        };
        this.platObj.onClose(rcb);
        this.platObj.show({
            success: () => {
                console.log('视频广告展示成功：' + this.config.name);
                cc.game.emit(cc.game.EVENT_HIDE);
            },
            fail: (result) => {
                console.log('视频广告展示失败：' + this.config.name + ' 错误:' + JSON.stringify(result));
                this.platObj.offClose(rcb);
                this.platObj.load();
                this.enable = false;
                if (cb) {
                    cb(false);
                }
            }
        });
    }
}
