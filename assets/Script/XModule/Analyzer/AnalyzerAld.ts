/*******************************************************************************
文件: AnalyzerAld.ts
创建: 2020年07月03日
作者: 老张(zwx@xfire.mobi)
描述:
    阿拉丁统计插件的封装
*******************************************************************************/
import AnalyzerInterface from './AnalyzerInterface';

export default class AnalyzerAld extends AnalyzerInterface {
    private appkey: string;
    private getLocation: boolean;

    public constructor(appkey: string, getLocation = false) {
        super();
        this.appkey = appkey;
        this.getLocation = getLocation;
    }

    /** 给Analyzer用，不要擅自调用 */
    public init(): boolean {
        let win: any = window;
        if (win.aldInit == null) {
            return false;
        }
        win.aldInit(this.appkey, this.getLocation);
        return true;
    }

    public sendCustomEvent(customEventName: string, eventArg?: string): void {
        let win: any = window;
        let wxapi: any = win.wx;
        if (wxapi && wxapi.aldSendEvent) {
            wxapi.aldSendEvent(customEventName, eventArg);
        }
    }

    public stageEnter(stageId: number, userId?: string): void {
        let win: any = window;
        let wxapi: any = win.wx;
        if (wxapi && wxapi.aldStage) {
            wxapi.aldStage.onStart({
                stageId,
                stageName: stageId.toString(),
                userId
            });
        }
    }

    public stageEnd(stageId: number, succ: boolean, score?: number, userId?: string): void {
        let win: any = window;
        let wxapi: any = win.wx;
        if (wxapi && wxapi.aldStage) {
            wxapi.aldStage.onEnd({
                stageId,
                stageName: stageId.toString(),
                userId,
                event: succ ? 'complete' : 'fail'
            });
        }
    }
}
