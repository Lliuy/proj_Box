/*******************************************************************************
文件: AnalyzerPlat.ts
创建: 2020年07月03日
作者: 老张(zwx@xfire.mobi)
描述:
    平台只带统计接口封装，因为xfire已经封装过一次，所以使用的接口是xfire.analyzerXXX
*******************************************************************************/

import AnalyzerInterface from './AnalyzerInterface';

export default class AnalyzerPlat extends AnalyzerInterface {
    /** 给Analyzer用，不要擅自调用 */
    public init(): boolean {
        return true;
    }

    public supportCustomEventArgument() {
        return false;
    }

    public sendCustomEvent(customEventName: string, eventArg?: string): void {
        xfire.analyzerSendEvent(customEventName, eventArg);
    }

    public stageEnter(stageId: number, userId?: string): void {
        xfire.analyzerStageEnter(stageId, userId);
    }

    public stageEnd(stageId: number, succ: boolean, score?: number, userId?: string): void {
        xfire.analyzerStageEnd(stageId, succ, score, userId);
    }
}
