/*************************************************************************
文件: xfire_db.ts
创建: 2020年04月02日
作者: 老张(zwx@xfire.mobi)
描述:
    桌面浏览器，主要用于调试

    平台特性：
        1.支持计费模拟
*************************************************************************/

/**
 * 桌面浏览器
 */
import XFireApp, { AdCfg, BannerAd, LaunchOptions, LoginError, LoginResult, OrderInfo, SdkCfg, SystemInfo } from './xfire_base';
const KEY_USERNAME = '__browser_login_username';
const KEY_PASSWORD = '__browser_login_password';

export default class XFireAppDB extends XFireApp{
    private pageLogin: cc.Node = null;
    private nativePayNotifier: {success?: (orderInfo: OrderInfo) => void; cancel?: (orderInfo: OrderInfo) => void; fail?: (orderInfo: OrderInfo, failMsg: string) => void} = null;

    public constructor() {
        super();
        this.plat = this.PLAT_DESKTOP_BROWSER;
    }

    public getAdSdkName(): string {
        return '桌面浏览器';
    }

    public supportBannerAd(): boolean {
        return this.plat === this.PLAT_DESKTOP_BROWSER;
    }

    public supportBannerAdMove(): boolean {
        return true;
    }

    public supportVideoAd(): boolean {
        return false;
    }

    public supportInterstitialAd(): boolean {
        return false;
    }

    public getSystemInfoSync(): SystemInfo {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        if (cc.sys.platform === cc.sys.DESKTOP_BROWSER) {
            let divGame = document.getElementById('GameDiv');
            let gameWidth = divGame.clientWidth;
            let gameHeight = divGame.clientHeight;
            return {
                brand: navigator.vendor,
                model: navigator.appVersion,
                pixelRatio: 1,
                screenWidth: gameWidth,
                screenHeight: gameHeight,
                windowWidth: gameWidth,
                windowHeight: gameHeight,
                language: navigator.language
            };
        }
        return null;
    }

    public supportPayment(): boolean {
        return true;
    }

    public supportClipboard () {
        return true;
    }

    /**
     * 将字符串复制到剪贴板，成功true，失败false
     * @param content 拷贝内容
     */
    public setClipboardData (content: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            try {
                window.navigator.clipboard.writeText(content)
                    .then(() => resolve(true))
                    .catch(() => resolve(false));
            } catch (e) {
                resolve(false);
            }
            resolve(false);
        });
    }

    public getClipboardData (): Promise<string> {
        return new Promise<string>((resolve) => {
            try {
                window.navigator.clipboard.readText()
                    .then((text) => {
                        resolve(text);
                    })
                    .catch((err) => {
                        resolve('');
                    });
            } catch (e) {
                resolve('');
            }
            resolve('');
        });
    }

    public supportLogin(): boolean {
        return true;
    }

    public login(params: {
        timeout?: number;                       // 超时时间，单位ms
        success?: (res: LoginResult) => void;
        fail?: (err: LoginError) => void;
        complete?: () => void;
    }= {}): void {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        let username = cc.sys.localStorage.getItem(KEY_USERNAME);
        let password = cc.sys.localStorage.getItem(KEY_PASSWORD);
        if (username == null || username === '' || password == null || password === '') {
            this.createLoginUI(params);
        }
        else {
            this.doLogin(username, password, params);
        }
    }

    public createBannerAd(sdkConfig: SdkCfg, cfg: AdCfg): BannerAd {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        return new BannerAdDBSim(sdkConfig, cfg);
    }

    protected nativePay(payPoint: string, orderid: string) {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        if (false) {
            return super.nativePay(payPoint, orderid);
        }
        let cfg = this.getPayPointConfig(payPoint);
        let ret = window.confirm(`是否购买：【${cfg.goods}】` + (cfg.count > 1 ? 'x' + cfg.count + '?' : '?') + '  价格:' + cfg.price + '元。');
        setTimeout(() => {
            if (ret) {
                // 模拟成功
                if (this.nativePayNotifier && this.nativePayNotifier.success) {
                    this.nativePayNotifier.success({payPoint, orderid, goodsName: cfg.goods, count: cfg.count, price: cfg.price});
                }
            }
            else {
                // 模拟失败
                if (this.nativePayNotifier && this.nativePayNotifier.fail) {
                    this.nativePayNotifier.fail({payPoint, orderid, goodsName: cfg.goods, count: cfg.count, price: cfg.price}, '计费失败');
                }
            }
        }, 2000);
    }

    protected nativeSetPayNotifier(notifier: {
        success?: (orderInfo: OrderInfo) => void;
        cancel?: (orderInfo: OrderInfo) => void;
        fail?: (orderInfo: OrderInfo, failMsg: string) => void;
    }) {
        this.nativePayNotifier = notifier;
    }

    private createLoginUI(params: {
        timeout?: number;                       // 超时时间，单位ms
        success?: (res: LoginResult) => void;
        fail?: (err: LoginError) => void;
        complete?: () => void;
    }) {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        if (this.pageLogin) {
            return;
        }
        let layerAd = xfire.getLayerNativeAd();
        let pageLogin = new cc.Node('模拟登录页');
        layerAd.addChild(pageLogin);
        this.pageLogin = pageLogin;
        pageLogin.width = cc.view.getVisibleSize().width;
        pageLogin.height = cc.view.getVisibleSize().height;
        pageLogin.x = 0; // cc.view.getVisibleSize().width / 2;
        pageLogin.y = 0; // cc.view.getVisibleSize().height / 2;
        pageLogin.zIndex = cc.macro.MAX_ZINDEX;
        pageLogin.addComponent(cc.BlockInputEvents);
        let createSpriteNode = (width: number, height: number, color?: cc.Color, opacity?: number) => {
            let node = new cc.Node();
            let sprite = node.addComponent(cc.Sprite);
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = this.loadRemoteImage('https://imgcdn.orbn.top/g/common/img/blank.png', true);
            node.width = width;
            node.height = height;
            if (color) {
                node.color = color;
            }
            if (opacity != null) {
                node.opacity = opacity;
            }
            return node;
        };
        // 底色
        pageLogin.addChild(createSpriteNode(
            cc.view.getVisibleSize().width,
            cc.view.getVisibleSize().height,
            cc.Color.BLACK,
            128)
        );

        // 登录框 账号
        let editUsername: cc.EditBox = null;
        {
            let node = new cc.Node('账号标签');
            let label = node.addComponent(cc.Label);
            label.string = '账号：';
            pageLogin.addChild(node);
            node.x = -100;

            node = new cc.Node('账号输入框');
            let edit = editUsername = node.addComponent(cc.EditBox);
            pageLogin.addChild(node);
            node.width = 200;
            node.height = 40;
            node.x = 100;
            edit.inputFlag = cc.EditBox.InputFlag.DEFAULT;
            edit.inputMode = cc.EditBox.InputMode.SINGLE_LINE;
            edit.fontSize = 20;
            edit.lineHeight = 40;
            (edit as any)._init();
            edit.textLabel.fontSize = 20;
            edit.textLabel.lineHeight = 40;
            edit.textLabel.node.width = node.width;
            edit.textLabel.node.x = -node.width / 2;
            edit.textLabel.node.y = node.height / 2;

            // 底图
            {
                let spnode = createSpriteNode(node.width, node.height, cc.color(164, 164, 164));
                spnode.zIndex = -1;
                node.addChild(spnode);
            }
        }
        // 登录框 密码
        let editPassname: cc.EditBox = null;
        {
            let node = new cc.Node('密码标签');
            let label = node.addComponent(cc.Label);
            label.string = '密码：';
            pageLogin.addChild(node);
            node.x = -100;
            node.y = -100;

            node = new cc.Node();
            let edit = editPassname = node.addComponent(cc.EditBox);
            pageLogin.addChild(node);
            node.width = 200;
            node.height = 40;
            node.x = 100;
            node.y = -100;
            edit.placeholderFontColor = cc.Color.GRAY;
            edit.inputFlag = cc.EditBox.InputFlag.PASSWORD;
            edit.inputMode = cc.EditBox.InputMode.SINGLE_LINE;
            edit.fontSize = 20;
            edit.lineHeight = 40;
            (edit as any)._init();
            edit.textLabel.fontSize = 20;
            edit.textLabel.lineHeight = 40;
            edit.textLabel.node.width = node.width;
            edit.textLabel.node.x = -node.width / 2;
            edit.textLabel.node.y = node.height / 2;

            // 底图
            {
                let spnode = createSpriteNode(node.width, node.height, cc.color(192, 192, 192));
                spnode.zIndex = -1;
                node.addChild(spnode);
            }
        }
        // 登录按钮
        {
            let node = new cc.Node();
            let btn = node.addComponent(cc.Button);
            node.y = -200;
            node.width = 150;
            node.height = 50;
            node.color = cc.color(192, 192, 192);
            pageLogin.addChild(node);
            btn.transition = cc.Button.Transition.SCALE;
            node.on('click', () => {
                this.doLogin(editUsername.string, editPassname.string, params);
            }, this);
            // 底图
            {
                let sprite = node.addComponent(cc.Sprite);
                sprite.spriteFrame = this.loadRemoteImage('https://imgcdn.orbn.top/g/common/img/blank.png', true);
                sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            }
            // 文本
            {
                let nodeLbl = new cc.Node();
                let label = nodeLbl.addComponent(cc.Label);
                label.string = '登录';
                node.addChild(nodeLbl);
                nodeLbl.color = cc.Color.BLACK;
            }
        }
    }

    private doLogin(username: string, password: string, params: {
        timeout?: number;                       // 超时时间，单位ms
        success?: (res: LoginResult) => void;
        fail?: (err: LoginError) => void;
        complete?: () => void;
    }) {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        setTimeout(() => {
            if (username == null || password == null || username.length < 4 || password.length < 4) {
                if (params.fail) {
                    params.fail({msg: '未输入合法账号密码，不要短于4字符'});
                }
            }
            else {
                if (params.success) {
                    cc.sys.localStorage.setItem(KEY_USERNAME, username);
                    cc.sys.localStorage.setItem(KEY_PASSWORD, password);
                    params.success({plat: this.plat, username, password});
                    if (this.pageLogin) {
                        this.pageLogin.removeFromParent();
                        this.pageLogin = null;
                    }
                }
            }
            if (params.complete) {
                params.complete();
            }
        }, 0);
    }

}

class BannerAdDBSim extends BannerAd{
    // 需要展示的位置与宽高
    private movetoBox: {left: number; top: number; width: number; height: number} = null;
    private scaleToPlat = 1;
    private realSize = {width: 0, height: 0};   // 平台单位

    public constructor(sdkConfig: SdkCfg, config: AdCfg) {
        super(sdkConfig, config);
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        let screenSize = cc.view.getVisibleSize();
        let cfgStyle = config.style || {left: 0, bottom: 0, width: screenSize.width, height: screenSize.width / 2.917};
        this.movetoBox = {left: cfgStyle.left, top: screenSize.height - cfgStyle.bottom - cfgStyle.height, width: cfgStyle.width, height: cfgStyle.height};
        let sysInfo = xfire.getSystemInfoSync();
        this.scaleToPlat = sysInfo.screenWidth / screenSize.width;
        this.realSize.width = this.movetoBox.width * this.scaleToPlat;
        this.realSize.height = this.movetoBox.height * this.scaleToPlat;
    }

    public supportAutoRefresh() {
        return true;
    }

    public load(): void {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        // 定义style转换接口
        let genBannerAdStyle = (style: {left?: number; top?: number; width?: number; height?: number}): any => {
            return {left: style.left * this.scaleToPlat, top: style.top * this.scaleToPlat, width: style.width * this.scaleToPlat, height: style.height * this.scaleToPlat};
        };

        let style = genBannerAdStyle(this.movetoBox);
        let banner = createBannerAd({adUnitId: this.config.id, style});
        this.platObj = banner;
        if (banner == null) {
            console.log('创建banner失败');
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
            banner.onResize((res: {width: number; height: number}) => {
                console.log('banner onResize：' + this.config.name + ' size：' + JSON.stringify(res));
                this.realSize.width = res.width;
                this.realSize.height = res.height;
                let imageRatio = res.width / res.height;
                let dstHeight = this.movetoBox.height;
                let gheight = res.height / this.scaleToPlat;
                // 广告实际高度过高 调整宽度 使高度自动调整到预期
                if (gheight > dstHeight) {
                    let dstWidth = this.realSize.width = res.width * dstHeight / gheight;
                    this.realSize.height = dstWidth / imageRatio;
                    banner.resetStyle({
                        left: (cc.view.getVisibleSize().width * this.scaleToPlat - this.realSize.width) / 2,
                        width: dstWidth
                    });
                }
                // 广告实际高度偏小 如果alignToBottom则往下移动点
                else if (gheight < dstHeight) {
                    let dstTop = (this.movetoBox.top + this.movetoBox.height) * this.scaleToPlat - this.realSize.height;
                    banner.resetStyle({
                        left:  (cc.view.getVisibleSize().width * this.scaleToPlat - this.realSize.width) / 2,
                        top: dstTop
                    });
                }
            });
        }
    }

    public get size(): {width: number; height: number} {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }

        if (this.platObj == null) {
            return {width: 0, height: 0};
        }
        else {
            let width = this.realSize.width / this.scaleToPlat;
            let height = this.realSize.height / this.scaleToPlat;
            return {width, height};
        }
    }

    public moveTo(bottom: number): void {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        let lBottom = bottom;
        if (lBottom < 0) {
            lBottom = 0;
        }
        this.movetoBox.top = cc.view.getVisibleSize().height - lBottom - this.movetoBox.height;
        if (this.movetoBox.top < 0) {
            this.movetoBox.top = 0;
        }
        if (this.platObj != null) {
            let dstTop = (this.movetoBox.top + this.movetoBox.height) * this.scaleToPlat - this.realSize.height;
            this.platObj.resetStyle({top: dstTop});
        }
    }

    public moveToEx(left: number, top: number, width: number, height: number): void {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        let sizeChanged = this.movetoBox.width !== width || this.movetoBox.height !== height;
        this.movetoBox = {left, top, width, height};
        if (this.platObj != null) {
            let dstLeft = left * this.scaleToPlat;
            let dstTop = (top + height) * this.scaleToPlat - this.realSize.height;
            // 不要超出屏幕上方、下方
            let platScreenHeight = cc.view.getVisibleSize().height * this.scaleToPlat;
            if (dstTop < 0) {
                dstTop = 0;
            }
            else if (dstTop > (platScreenHeight - this.realSize.height)) {
                dstTop = platScreenHeight - this.realSize.height;
            }
            let dstWidth = width * this.scaleToPlat;
            let dstHeight = height * this.scaleToPlat;
            let style: {left?: number; top?: number; width?: number; height?: number} = {};
            style.left = dstLeft + (dstWidth - this.realSize.width) / 2;
            style.top = dstTop;
            if (sizeChanged) {
                style.width = dstWidth;
                style.height = dstHeight;
            }
            this.platObj.resetStyle(style);
        }
    }

    public destroy(): void {
    }

    protected nativeShow(): void {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.show();
        }
    }

    protected nativeHide(): void {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        if (this.platObj != null) {
            this.platObj.hide();
        }
    }
}

class SimBannerAd{
    private game: HTMLElement;
    private banner: HTMLDivElement;
    private img: HTMLImageElement;
    private style: {left?: number; top?: number; width?: number; height?: number} = {};
    private cbOnLoad: () => void;
    private cbOnResize: (res: {width: number; height: number}) => void;

    public constructor(game: HTMLElement, banner: HTMLDivElement, img: HTMLImageElement,
        style: {left?: number; top?: number; width?: number; height?: number}
    ) {
        this.game = game;
        this.banner = banner;
        this.img = img;
        this.style.left = style.left;
        this.style.top = style.top;
        this.style.width = style.width;
        this.style.height = style.height;
    }

    public show() {
        this.banner.style.display = '';
    }

    public hide() {
        this.banner.style.display = 'none';
    }

    public onLoad(cb: () => void) {
        this.cbOnLoad = cb;
    }

    public onResize(cb: (res: {width: number; height: number}) => void) {
        this.cbOnResize = cb;
    }

    public triggerOnLoad() {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        this.banner.style.left = this.style.left + 'px';
        this.banner.style.top = this.style.top + 'px';
        this.refreshSize();
        if (this.cbOnLoad) {
            this.cbOnLoad();
        }
    }

    public resetStyle(style: {left?: number; top?: number; width?: number; height?: number}) {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        if (style.left) {
            this.style.left = style.left;
            this.banner.style.left = this.style.left + 'px';
        }
        if (style.top) {
            this.style.top = style.top;
            this.banner.style.top = this.style.top + 'px';
        }

        let refreshSize = false;
        if (style.width) {
            refreshSize = refreshSize || (this.style.width !== style.width);
            this.style.width = style.width;
        }
        if (style.height) {
            refreshSize = refreshSize || (this.style.height !== style.height);
            this.style.height = style.height;
        }
        if (refreshSize) {
            this.refreshSize();
        }
    }

    private triggerOnResize(width: number, height: number) {
        if (this.cbOnResize)     {
            this.cbOnResize({width, height});
        }
    }

    private refreshSize() {
        if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
            return;
        }
        let imgWidth = this.img.naturalWidth;
        let imgHeight = this.img.naturalHeight;
        let imgRatio = imgWidth / imgHeight;
        let styleRatio = this.style.width / this.style.height;

        let styleWidth = this.style.width;
        let styleHeight = this.style.height;

        let dstWidth = this.style.width;
        let dstHeight = this.style.height;
        dstWidth = this.style.width;
        dstHeight = this.style.width / imgRatio;

        this.img.style.width = dstWidth + 'px';
        this.img.style.height = dstHeight + 'px';

        if ((dstHeight - styleHeight) / dstHeight > 0.01) {
            this.triggerOnResize(dstWidth, dstHeight);
        }

    }
}

function createBannerAd(params: {adUnitId: string; style?: {left?: number; top?: number; width?: number; height?: number}}): SimBannerAd {
    if (xfire.plat !== xfire.PLAT_DESKTOP_BROWSER && xfire.plat !== xfire.PLAT_MOBILE_BROWSER) {
        return;
    }

    if (cc.sys.platform !== cc.sys.DESKTOP_BROWSER) {
        return;
    }

    let lStyle = params.style || {};

    let divGame = document.getElementById('GameDiv');
    divGame.style.overflow = 'hidden';      // 防止banner溢出时显示出来
    let gameWidth = divGame.clientWidth;
    let gameHeight = divGame.clientHeight;

    let banner = document.createElement('div');
    divGame.appendChild(banner);

    banner.setAttribute('style', `position:absolute; width:${gameWidth}px;top:600px;left:0px;`);
    banner.style.display = 'none';

    let img = document.createElement('img');
    banner.appendChild(img);

    let ret = new SimBannerAd(divGame, banner, img,
        {left: lStyle.left || 0, top: lStyle.top || 0, width: lStyle.width || gameWidth, height: lStyle.height || 300}
    );

    img.setAttribute('src', 'http://imgcdn.orbn.top/g/common/img/SampleBanner01.png');
    img.setAttribute('style', 'position:absolute');
    img.style.left = 0 + 'px';
    img.onload = (event: Event) => {
        setTimeout(() => {
            ret.triggerOnLoad();
        }, 0);
    };

    return ret;
}
