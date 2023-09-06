/*******************************************************************************
文件: SUILabel.ts
创建: 2021年03月17日
作者: 老张(zwx@xfire.mobi)
描述:
    针对Label的导入导出
*******************************************************************************/

import SUIComponent from './SUIComponent';
import { SControl, SNode } from './SUIData';
import SUIResLoader from './SUIResLoader';

export default class SUILabel extends SUIComponent {
    public init(node: cc.Node, data: SControl, loader: SUIResLoader): void {
        let label = node.getComponent(cc.Label);
        if (label == null) {
            label = node.addComponent(cc.Label);
        }
        let prop = data.properties;
        if (label != null && prop != null) {
            if (prop.hAlign != null) label.horizontalAlign = prop.hAlign;
            if (prop.vAlign != null) label.verticalAlign = prop.vAlign;
            if (prop.fontSize != null) label.fontSize = prop.fontSize;
            if (prop.lineHeight != null) label.lineHeight = prop.lineHeight;
            if (prop.overflow != null) label.overflow = prop.overflow;
            if (prop.string != null) label.string = prop.string;
            if (prop.cacheMode != null) label.cacheMode = prop.cacheMode;
        }
    }

    public genData(node: cc.Node): SControl {
        if (!CC_DEV) {
            if (CC_PREVIEW) console.log('SUILabel genData仅开发环境使用');
            return;
        }
        let label = node.getComponent(cc.Label);
        if (label == null) {
            console.error('结点未添加cc.Label组件');
            return;
        }
        let cmp = new SControl();
        cmp.name = 'Label';
        if (!label.enabled) {
            cmp.enabled = false;
        }
        cmp.properties = {
            string: label.string,
            hAlign: label.horizontalAlign,
            vAlign: label.verticalAlign,
            fontSize: label.fontSize,
            lineHeight: label.lineHeight,
            overflow: label.overflow,
            cacheMode: label.cacheMode
        };
        return cmp;
    }
}
