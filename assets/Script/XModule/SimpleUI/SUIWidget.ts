/*******************************************************************************
文件: SUIWidget.ts
创建: 2021年03月17日
作者: 老张(zwx@xfire.mobi)
描述:
    针对Widget的导入导出
*******************************************************************************/

import SUIComponent from './SUIComponent';
import { SControl, SNode } from './SUIData';
import SUIResLoader from './SUIResLoader';

export default class SUIWidget extends SUIComponent {
    public init(node: cc.Node, data: SControl, loader: SUIResLoader): void {
        let widget = node.getComponent(cc.Widget);
        if (widget == null) {
            widget = node.addComponent(cc.Widget);
        }
        let prop = data.properties;
        if (widget != null && prop != null) {
            if (prop.alignMode != null) widget.alignMode = prop.alignMode;
            if (prop.left != null)      { widget.isAlignLeft = true;    widget.left = prop.left; }
            if (prop.top != null)       { widget.isAlignTop = true;     widget.top = prop.top; }
            if (prop.right != null)     { widget.isAlignRight = true;   widget.right = prop.right; }
            if (prop.bottom != null)    { widget.isAlignBottom = true;  widget.bottom = prop.bottom; }
        }
    }

    public genData(node: cc.Node): SControl {
        if (!CC_DEV) {
            if (CC_PREVIEW) console.log('SUIWidget genData仅开发环境使用');
            return;
        }
        let widget = node.getComponent(cc.Widget);
        if (widget == null) {
            console.error('结点未添加cc.Widget组件');
            return;
        }
        let cmp = new SControl();
        cmp.name = 'Widget';
        if (!widget.enabled) {
            cmp.enabled = false;
        }
        cmp.properties = {
            left: widget.isAlignLeft ? widget.left : undefined,
            top: widget.isAlignTop ? widget.top : undefined,
            right: widget.isAlignRight ? widget.right : undefined,
            bottom: widget.isAlignBottom ? widget.bottom : undefined,
            alignMode: widget.alignMode !== cc.Widget.AlignMode.ON_WINDOW_RESIZE ? widget.alignMode : null
        };
        return cmp;
    }
}
