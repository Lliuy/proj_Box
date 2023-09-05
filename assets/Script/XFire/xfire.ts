import XFireApp4399 from './xfire_4399';
import XFireAppAndroid from './xfire_android';
import XFireAppBaidu from './xfire_baidu';
import XFireApp from './xfire_base';
import XFireAppByteDance from './xfire_bytedance';
import XFireConfigs from './xfire_config';
import XFireAppDB from './xfire_db';
import XFireAppHuawei from './xfire_huawei';
import XFireAppJKW from './xfire_jkw';
import XFireAppKaiXin from './xfire_kaixin';
import XFireAppKuaiKan from './xfire_kuaikan';
import XFireAppKuaiShou from './xfire_kuaishou';
import XFireAppKuGou from './xfire_kugou';
import XFireAppLinkSure from './xfire_linksure';
import XFireAppMB from './xfire_mb';
import XFireAppMBDQ from './xfire_mbdq';
import XFireAppMeiZu from './xfire_meizu';
import XFireAppOppo from './xfire_oppo';
import XFireAppQihu from './xfire_qihu';
import XFireAppQQ from './xfire_qq';
import XFireAppQuTouTiao from './xfire_qutoutiao';
import XFireAppSnowFish from './xfire_snowfish';
import XFireAppSnowFlake from './xfire_snowflake';
import XFireAppUC from './xfire_uc';
import XFireAppVivo from './xfire_vivo';
import XFireAppWechat from './xfire_wechat';
import XFireAppXiaomi from './xfire_xiaomi';

console.log('xfire version: ' + XFireConfigs.版本);

let ccapi = cc as any;

let inst: XFireApp;
if (cc.sys.platform === cc.sys.WECHAT_GAME) {
    const qqapi: any = (window as any).qq;
    const byteapi: any = (window as any).tt;
    const qhapi: any = (window as any).qh;
    if (qqapi != null) {
        inst = new XFireAppQQ();
    }
    else if (byteapi != null) {
        inst = new XFireAppByteDance();
    }
    else if (qhapi != null) {
        inst = new XFireAppQihu();
    }
    else {
        inst = new XFireAppWechat();
    }
}
else if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.ANDROID) {
    inst = new XFireAppAndroid();
}
else if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.DESKTOP_BROWSER) {
    const kaixinapi: any = (window as any).kaixin;
    const qttapi: any = (window as any).qttGame;
    const sfapi: any = (window as any).$SF;
    if (kaixinapi != null) {
        inst = new XFireAppKaiXin();
    }
    else if (qttapi != null) {
        inst = new XFireAppQuTouTiao();
    }
    else if (sfapi != null) {
        inst = new XFireAppSnowFish();
    }
    else {
        inst = new XFireAppDB();
    }
}
else if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.BAIDU_GAME) {
    inst = new XFireAppBaidu();
}
else if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.OPPO_GAME) {
    inst = new XFireAppOppo();
}
else if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.VIVO_GAME) {
    inst = new XFireAppVivo();
}
else if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.HUAWEI_GAME) {
    inst = new XFireAppHuawei();
}
else if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === ccapi.sys.XIAOMI_GAME) {
    inst = new XFireAppXiaomi();
}
else if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.JKW_GAME) {
    const lsapi: any = (window as any).wuji;
    if (lsapi) {
        inst = new XFireAppLinkSure();
    }
    else {
        inst = new XFireAppJKW();
    }
}
else if (!cc.sys.platform === cc.sys.WECHAT_GAME && cc.sys.platform === cc.sys.MOBILE_BROWSER) {
    const kaixinapi: any = (window as any).kaixin;
    const meizuapi: any = (window as any).mz;
    const qttapi: any = (window as any).qttGame;
    const ucapi: any = (window as any).uc;
    const sfapi: any = (window as any).$SF;
    const dqapi: any = (window as any).HXADH5;
    const isks: boolean = (window as any)._isKS;
    const kkapi: any = (window as any).kkH5sdk;
    const snowflakeapi: any = (window as any).vlion_Game_Sdk;
    const api4399: any = (window as any).h5api;
    const kugouapi: any = (window as any).MiniGame;
    if (isks) {
        inst = new XFireAppKuaiShou();
    }
    else if (snowflakeapi != null) {
        inst = new XFireAppSnowFlake();
    }
    else if (kkapi != null) {
        inst = new XFireAppKuaiKan();
    }
    else if (kaixinapi != null) {
        inst = new XFireAppKaiXin();
    }
    else if (meizuapi != null) {
        inst = new XFireAppMeiZu();
    }
    else if (qttapi != null) {
        inst = new XFireAppQuTouTiao();
    }
    else if (ucapi != null) {
        inst = new XFireAppUC();
    }
    else if (sfapi != null) {
        inst = new XFireAppSnowFish();
    }
    else if (dqapi != null) {
        inst = new XFireAppMBDQ();
    }
    else if (api4399 != null) {
        inst = new XFireApp4399();
    }
    else if (kugouapi != null) {
        inst = new XFireAppKuGou();
    }
    else {
        inst = new XFireAppMB();
    }
}
if (inst == null) {
    inst = new XFireApp();
}

console.log('xfire plat: ' + inst.plat + ' AD:' + inst.getAdSdkName());

export default inst;
