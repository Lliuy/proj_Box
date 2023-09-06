/*******************************************************************************
文件: SUIComponent.ts
创建: 2021年03月17日
作者: 老张(zwx@xfire.mobi)
描述:
    简单UI基类
*******************************************************************************/

import { SControl, SNode } from './SUIData';
import SUIResLoader from './SUIResLoader';

export default abstract class SUIComponent {
    public abstract init(node: cc.Node, data: SControl, loader: SUIResLoader): void;
    public abstract genData(node: cc.Node): SControl;
}
