/*******************************************************************************
文件: SUIDragger.ts
创建: 2021年03月23日
作者: 老张(zwx@xfire.mobi)
描述:
    针对XDragger的导出导入
*******************************************************************************/

import XDragger from '../../XFireControl/XDragger';
import SUIComponent from './SUIComponent';
import { SControl, SNode } from './SUIData';
import SUIResLoader from './SUIResLoader';

export default class SUIDragger extends SUIComponent {
    public init(node: cc.Node, data: SControl, loader: SUIResLoader): void {
        let dragger = node.getComponent(XDragger);
        if (dragger == null) {
            dragger = node.addComponent(XDragger);
        }

        let prop = data.properties;
        if (dragger != null && data.properties != null) {
            if (prop.dragThreshold != null) dragger.dragThreshold = prop.dragThreshold;
            if (prop.realtimeSet != null) dragger.realtimeSet = prop.realtimeSet;
            if (prop.up != null) dragger['up'] = prop.up;
            if (prop.down != null) dragger['down'] = prop.down;
            if (prop.left != null) dragger['left'] = prop.left;
            if (prop.right != null) dragger['right'] = prop.right;
        }
    }

    public genData(node: cc.Node): SControl {
        if (!CC_DEV) {
            if (CC_PREVIEW) console.log('SUIDragger genData仅开发环境使用');
            return;
        }
        let dragger = node.getComponent(XDragger);
        if (dragger == null) {
            console.error('结点未添加XDragger组件');
            return;
        }
        let cmp = new SControl();
        cmp.name = 'Dragger';
        if (!dragger.enabled) {
            cmp.enabled = false;
        }
        cmp.properties = {
            dragThreshold: dragger.dragThreshold,
            realtimeSet: dragger.realtimeSet,
            up: dragger['up'],
            down: dragger['down'],
            left: dragger['left'],
            right: dragger['right']
        };
        return cmp;
    }
}
