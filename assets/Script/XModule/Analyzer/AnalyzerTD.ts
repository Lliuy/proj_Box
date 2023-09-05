/*******************************************************************************
文件: AnalyzerTD.ts
创建: 2020年7月6日
作者: 老张(zwx@xfire.mobi)
描述:
    talkingdata统计插件的封装
    关卡统计使用事件统计进行模拟

appkey申请方法（由运营申请）：
    ✦登录https://www.talkingdata.com/
    ✦进入产品中心
    ✦选择【应用统计分析】
    ✦点击【创建应用】
    ✦填写名称，平台选择小程序图标（45°的8形图案）
    ✦应用类型选择游戏
    ✦选择任意游戏类型
    ✦填写微信小程序id和secret

域名配置：
    平台需配置request域名：
        https://h5.udrig.com
        https://api.talkingdata.com
*******************************************************************************/
import AnalyzerInterface from './AnalyzerInterface';

export default class AnalyzerTD extends AnalyzerInterface {
    private appkey: string;
    private appName: string;
    private wxid: string;

    public constructor(appkey: string, appName: string, wxid: string) {
        super();
        this.appkey = appkey;
        this.appName = appName;
        this.wxid = wxid;
    }

    /** 给Analyzer用，不要擅自调用 */
    public init(): boolean {
        let win: any = window;
        if (win.tdInit == null) {
            return false;
        }
        win.tdInit({
            appkey: this.appkey,
            appName: this.appName,
            wxAppid: this.wxid
        });
        return true;
    }

    public supportCustomEventArgument() {
        return false;
    }

    public sendCustomEvent(customEventName: string, eventArg?: string): void {
        let win: any = window;
        let tdAppSdk = win.GameGlobal.tdAppSdk;
        if (tdAppSdk && tdAppSdk.event) {
            tdAppSdk.event({id: eventArg ? (customEventName + '_' + eventArg) : customEventName});
        }
    }

    public stageEnter(stageId: number, userId?: string): void {
        this.sendCustomEvent('进入关卡:' + xfire.padStart(stageId.toString(), 3, '0'));
    }

    public stageEnd(stageId: number, succ: boolean, score?: number, userId?: string): void {
        let levelId = xfire.padStart(stageId.toString(), 3, '0');
        if (succ) {
            this.sendCustomEvent('闯关成功:' + levelId);
        }
        else {
            this.sendCustomEvent('闯关失败:' + levelId);
        }
    }
}
