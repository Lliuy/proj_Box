/*******************************************************************************
文件: AnalyzerTimer.ts
创建: 2021年01月22日
作者: 老张(zwx@xfire.mobi)
描述:
    模块计时插件
*******************************************************************************/

import Analyzer from '../Analyzer';

const {ccclass, menu, property} = cc._decorator;

@ccclass
@menu('XFire统计/模块计时')
export default class AnalyzerTimer extends cc.Component {
    @property({
        displayName: CC_DEV && '模块名',
        tooltip: CC_DEV && '留空将使用结点名'
    })
    public moduleName = '';

    public onLoad() {
        if (this.moduleName === '') {
            this.moduleName = this.node.name;
        }
    }

    public onEnable() {
        Analyzer.moduleEnter(this.moduleName);
    }

    public onDisable() {
        Analyzer.moduleEnd(this.moduleName);
    }
}
