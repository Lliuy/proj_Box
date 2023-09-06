/*******************************************************************************
文件: AnalyzerXFire.ts
创建: 2020年07月03日
作者: 老张(zwx@xfire.mobi)
描述:
    炫火自开发统计插件，微信、qq、字节跳动等要求验证域名的应在后台登记ana.orbn.top

域名配置：
    平台需配置request域名：
        https://ana.orbn.top
*******************************************************************************/

import AnalyzerInterface from './AnalyzerInterface';

const KeyUserid = 'zIFcXMQIo9';
const Host = 'https://ana.orbn.top/ana';

enum XFireInnerEvent {
    Init = 'a',
    CustomEvent = 'b',
    OnShow = 'c',
    OnHide = 'd',
    StageEnter = 'e',
    StageEnd = 'f',
    ModuleEnter = 'g',
    ModuleEnd = 'h',
    /** 模块计时，玩家持续在某模块时会进行计时，防止意外退出导致未计时 */
    ModuleTiming = 'i',
    Online = 'j'
}
/** 炫火统计插件 */
export class AnalyzerXFire extends AnalyzerInterface {
    private userid: string;
    private appkey: string;
    private solution: string;
    /** 上次激活时间，单位秒 */
    private lastShowTime = 0;
    /** 上次上报时长时间 */
    private lastTimeReportTime = 0;
    /** 是否停止上报，由服务器下发 */
    private stop = false;
    /** 定时上报在线时长，防止时长丢失 */
    private timerHandler: number;
    private hidden = false;

    /**
     * 炫火统计插件
     * @param appkey 应用key
     * @param solution 方案名
     */
    public constructor(appkey: string, solution = '') {
        super();
        this.appkey = appkey;
        this.solution = solution;
        this.lastTimeReportTime = xfire.currentTimeMillis / 1000;
    }

    /** 给Analyzer用，不要擅自调用 */
    public init(): boolean {
        // 已经初始化就不再进行初始化
        if (this.userid) {
            return true;
        }
        // 读取用户id，如果没有则新建用户id
        this.userid = cc.sys.localStorage.getItem(KeyUserid);
        if (this.userid == null || this.userid === '') {
            this.userid = this.genUserid();
            cc.sys.localStorage.setItem(KeyUserid, this.userid);
        }
        // onshow onhide
        xfire.onShow((options) => {
            this._sendEvent(XFireInnerEvent.OnShow);
            this.lastShowTime = xfire.currentTimeMillis / 1000;
            this.lastTimeReportTime = this.lastShowTime;
            this.hidden = false;
        });
        xfire.onHide(() => {
            let curTime = xfire.currentTimeMillis / 1000;
            let delta = Math.round(curTime - this.lastTimeReportTime);
            if (delta > 0) {
                this._sendEvent(XFireInnerEvent.OnHide, undefined, Math.min(delta, 61));
            }
            this.lastTimeReportTime = curTime;
            this.hidden = true;
        });
        if (!this.timerHandler) {
            this.timerHandler = setInterval(() => {
                if (this.hidden) return;
                let curTime = xfire.currentTimeMillis / 1000;
                let delta = Math.round(curTime - this.lastTimeReportTime);
                if (delta > 0) {
                    this._sendEvent(XFireInnerEvent.Online, undefined, Math.min(delta, 61));
                }
                this.lastTimeReportTime = curTime;
            }, 60 * 1000);
        }
        // 向服务器发送初始化事件
        this._sendEvent(XFireInnerEvent.Init);

        return true;
    }

    public supportCustomEventArgument() {
        return true;
    }

    public sendCustomEvent(customEventName: string, eventArg?: string): void {
        // 发送事件
        this._sendEvent(XFireInnerEvent.CustomEvent, customEventName, undefined, undefined, eventArg);
    }

    public stageEnter(stageId: number, userId?: string): void {
        this._sendEvent(XFireInnerEvent.StageEnter, undefined, stageId);
    }

    public stageEnd(stageId: number, succ: boolean, score?: number, userId?: string): void {
        this._sendEvent(XFireInnerEvent.StageEnd, succ ? 'succ' : 'fail', stageId, score);
    }

    public moduleEnter(module: string): void {
        this._sendEvent(XFireInnerEvent.ModuleEnter, module);
    }

    public moduleEnd(module: string, time: number): void {
        this._sendEvent(XFireInnerEvent.ModuleEnd, module, time);
    }

    public moduleTiming(module: string, time: number): void {
        this._sendEvent(XFireInnerEvent.ModuleTiming, module, time);
    }

    /**
     * 广义的事件发送接口，内部使用，将所有各类行为都抽象为事件
     * @param name 事件名
     * @param argInt1 整数参数1
     * @param argInt2 整数参数2
     */
    private _sendEvent(name: string, arg?: string, argInt1?: number, argInt2?: number, argStr2?: string) {
        if (this.stop) return;
        // 向服务器发送事件
        let body = {k: this.appkey, u: this.userid, p: xfire.plat, q: xfire.getSubPlat() || undefined, c: xfire.getChannel() || undefined, l: this.solution || undefined, n: name, s: arg, i1: argInt1, i2: argInt2, s2: argStr2};
        let str = CC_DEV ? JSON.stringify(body) : xfire.encrypt(JSON.stringify(body), 'hwmcn' + '923w6k' + 'y5l9p');
        (async () => {
            let ret = await xfire.httpGetStringWithBody(Host, str);
            if (ret.content === 'stop') {
                this.stop = true;
            }
        })();
    }

    /**
     * 生成用户id用于追踪
     */
    private genUserid(): string {
        let userid = Date.now().toString(16);
        userid += '-' + Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1);
        userid += '-' + Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1);
        userid += '-' + Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1);
        return userid;
    }
}
