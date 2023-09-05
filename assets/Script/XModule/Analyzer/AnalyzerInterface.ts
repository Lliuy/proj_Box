/*******************************************************************************
文件: AnalyzerInterface.ts
创建: 2020年07月03日
作者: 老张(zwx@xfire.mobi)
描述:
    统计插件接口抽象
*******************************************************************************/

/** 统计插件接口 */
export default abstract class AnalyzerInterface {
    /** 给Analyzer用，不要擅自调用，返回初始化结果，true成功，false失败，false的统计插件不会被使用 */
    public abstract init(): boolean;
    public abstract sendCustomEvent(customEventName: string, eventArg?: string): void;
    public abstract stageEnter(stageId: number, userId?: string): void;
    public abstract stageEnd(stageId: number, succ: boolean, score?: number, userId?: string): void;
    public moduleEnter(module: string): void {}
    public moduleEnd(module: string, time: number): void {}
    public moduleTiming(module: string, time: number): void {}
}
