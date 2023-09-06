/*******************************************************************************
文件: SUIButton.ts
创建: 2021年03月17日
作者: 老张(zwx@xfire.mobi)
描述:
    针对Button的导入导出
*******************************************************************************/

import SUIComponent from './SUIComponent';
import { SControl, SNode } from './SUIData';
import SUIResLoader from './SUIResLoader';

export default class SUIButton extends SUIComponent {
    public init(node: cc.Node, data: SControl, loader: SUIResLoader): void {
        let button = node.getComponent(cc.Button);
        if (button == null) {
            button = node.addComponent(cc.Button);
        }
        let prop = data.properties;
        if (button != null && prop != null) {
            if (prop.transition != null) button.transition = prop.transition;
            if (prop.zoomScale != null) button.zoomScale = prop.zoomScale;
        }
    }

    public genData(node: cc.Node): SControl {
        if (!CC_DEV) {
            if (CC_PREVIEW) console.log('SUIButton genData仅开发环境使用');
            return;
        }
        let button = node.getComponent(cc.Button);
        if (button == null) {
            console.error('结点未添加cc.Button组件');
            return;
        }
        let cmp = new SControl();
        cmp.name = 'Button';
        if (!button.enabled) {
            cmp.enabled = false;
        }
        cmp.properties = {
            transition: button.transition,
            zoomScale: button.transition === cc.Button.Transition.SCALE ? button.zoomScale : undefined,
            normalSprite: button.normalSprite != null ? button.normalSprite.name : undefined
        };
        return cmp;
    }
}
