/*******************************************************************************
文件: xfire_kuaikan.ts
创建: 2020年08月08日
作者: 老张(zwx@xfire.mobi)
描述:
    快看漫画
    文档地址：http://games.kkmh.com/kkH5sdk/sdk-doc/

打包方法：
    1.安装最新的打包插件1.5.0及以上
    2.xhappcfg里配置好【快看小程序】
    2.打包选择web-mobile平台，成功会生成kuaikan文件夹

测试方法：
    1.上传服务器 g/[游戏编号]/h5/kuaikan/v[版本号]/test
    2.电脑浏览器访问https://h5.orbn.top/g/[游戏编号]/h5/kuaikan/v[版本号]/test确保可行
    3.将2的游戏链接发给快看运营，让他们添加到白名单
    4.快看运营会提供入口
    5.在【快看APP】中使用快看提供的入口进入游戏

发布方法：
    1.测试完成后将游戏上传服务器g/[游戏编号]/h5/kuaikan/v[版本号]/ol
    2.将游戏链接https://h5.orbn.top/g/[游戏编号]/h5/kuaikan/v[版本号]/ol发送给快看
    3.等快看审核验收即可上线
*******************************************************************************/

import XFireApp, { AdCfg, InterstitialAd, LoginError, LoginResult, SdkCfg, SystemInfo, VideoAd } from './xfire_base';

const win: any = window;
const kkapi = win.kkH5sdk;

export default class XFireAppKuaiKan extends XFireApp{
    public constructor() {
        super();
        this.plat = this.PLAT_KUAIKAN;
        this.supportGuestLogin = false;
    }

    public getAdSdkName(): string {
        return '快看小程序';
    }

    public supportLogin(): boolean {
        return false;
    }

    public supportVideoAd(): boolean {
        return true;
    }

    public createVideoAd(sdkConfig: SdkCfg, cfg: AdCfg): VideoAd {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAIKAN) {
            return;
        }
        return new VideoAdKuaiKan(sdkConfig, cfg);
    }

    public getSystemInfoSync(): SystemInfo {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAIKAN) {
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

}

class VideoAdKuaiKan extends VideoAd{
    /** 上次检查是否就绪的时间戳，隔开1秒吧 */
    private lastCheckStateTime = 0;
    /** 标记是否播放完了 */
    private playEnd = false;
    private playCb: (end: boolean) => void = null;

    public load(): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAIKAN) {
            return;
        }
        this.platObj = {};
        kkapi.preloadAdVideos({
            ad_pos_id: this.config.id,
            context_id: this.sdkConfig.appid,
            callback: (res) => {
            }
        });
    }

    public update(dtSecond: number, idleTimeSecond: number): void {
        if ((Date.now() - this.lastCheckStateTime) < 1000) {
            return;
        }
        kkapi.isVideoReady({
            ad_pos_id: this.config.id,
            context_id: this.sdkConfig.appid,
            callback: (res) => {
                console.log(JSON.stringify(res));
                if (res && res.data) {
                    this.enable = res.data.status === 1;
                }
            }
        });
    }

    protected nativePlay(cb: (end: boolean) => void): void {
        if (cc.sys.platform === cc.sys.WECHAT_GAME || xfire.plat !== xfire.PLAT_KUAIKAN) {
            return;
        }
        cc.game.emit(cc.game.EVENT_HIDE);
        this.playEnd = false;
        kkapi.playAdVideo({
            ad_pos_id: this.config.id,
            context_id: this.sdkConfig.appid,
            extra: '',
            callback: (res) => {
                if (!res || !res.data) {
                    return;
                }
                switch (res.data.status) {
                    case 0: // 失败
                        if (cb) {
                            cb(false);
                        }
                        break;
                    case 1: // 成功
                        break;
                    case 2: // 关闭
                        if (cb) {
                            cb(this.playEnd);
                        }
                        break;
                    case 3: // 点击
                        break;
                    case 4: // 视频播放完毕
                        break;
                    case 5: // 成功获取奖励
                        this.playEnd = true;
                        break;
                    default:
                        break;
                }
            }
        });
    }
}
