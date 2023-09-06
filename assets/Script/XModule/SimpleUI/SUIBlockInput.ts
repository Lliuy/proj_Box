/*******************************************************************************
文件: SUIBlockInput.ts
创建: 2021年03月17日
作者: 老张(zwx@xfire.mobi)
描述:
    针对BlockInputEvents的导入导出
*******************************************************************************/

import SUIComponent from './SUIComponent';
import { SControl, SNode } from './SUIData';
import SUIResLoader from './SUIResLoader';

export default class SUIBlockInput extends SUIComponent {
    public init(node: cc.Node, data: SControl, loader: SUIResLoader): void {
        let block = node.getComponent(cc.BlockInputEvents);
        if (block == null) {
            block = node.addComponent(cc.BlockInputEvents);
        }
    }

    public genData(node: cc.Node): SControl {
        if (!CC_DEV) {
            if (CC_PREVIEW) console.log('SUIBlockInput genData仅开发环境使用');
            return;
        }
        let block = node.getComponent(cc.BlockInputEvents);
        if (block == null) {
            console.error('结点未添加cc.BlockInputEvents组件');
            return;
        }
        let cmp = new SControl();
        cmp.name = 'BlockInput';
        if (!block.enabled) {
            cmp.enabled = false;
        }
        return cmp;
    }
}
