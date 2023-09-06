/*******************************************************************************
文件: SimpleUI.ts
创建: 2021年03月17日
作者: 老张(zwx@xfire.mobi)
描述:
    动态UI模块，可生成、创建UI

资源加载器范例：
    class ResLoader extends SUIResLoader {
        public loadImage(name: string, ext?: string): Promise<cc.SpriteFrame> {
            return new Promise<cc.SpriteFrame>((resolve) => {
                cc.loader.loadRes('Image/nad/' + name, cc.SpriteFrame, (err, spriteFrame: cc.SpriteFrame) => {
                    if (err) {
                        cc.loader.load({ url: 'https://imgcdn.orbn.top/g/common/nad/' + name + (ext == null ? '.png' : ext), type: 'jpg' }, (err, tex) => {
                            let frame = new cc.SpriteFrame();
                            frame.name = name;
                            if (tex instanceof cc.Texture2D && err == null) {
                                frame.setTexture(tex);
                            }
                            resolve(frame);
                        });
                        return;
                    }
                    resolve(spriteFrame);
                });
            });
        }
    }
*******************************************************************************/

import XDragger from '../XFireControl/XDragger';
import SUIBlockInput from './SimpleUI/SUIBlockInput';
import SUIButton from './SimpleUI/SUIButton';
import SUIComponent from './SimpleUI/SUIComponent';
import { SNode } from './SimpleUI/SUIData';
import SUIDragger from './SimpleUI/SUIDragger';
import SUILabel from './SimpleUI/SUILabel';
import SUIResLoader from './SimpleUI/SUIResLoader';
import SUISprite from './SimpleUI/SUISprite';
import SUIWidget from './SimpleUI/SUIWidget';

export default class SimpleUI {
    public static exportData(node: cc.Node): string {
        let data = this.genNodeData(node);
        // 根结点不要位置信息
        if (data) {
            delete data.pos;
        }
        return JSON.stringify(data);
    }

    /** 根据结点数据实例化结点 */
    // tslint:disable-next-line: cyclomatic-complexity
    public static instantiate(data: SNode, loader: SUIResLoader) {
        let node = new cc.Node();
        if (data.active != null) {
            node.active = data.active;
        }
        if (data.name != null) {
            node.name = data.name;
        }
        if (data.color != null) {
            node.color = new cc.Color().fromHEX(data.color);
        }
        if (data.opacity != null) {
            node.opacity = data.opacity;
        }
        if (data.pos != null) {
            node.x = data.pos[0];
            node.y = data.pos[1];
        }
        if (data.anchor != null) {
            node.anchorX = data.anchor[0];
            node.anchorY = data.anchor[1];
        }
        if (data.size != null) {
            node.width = data.size[0];
            node.height = data.size[1];
        }
        if (data.scale != null) {
            node.scaleX = data.scale[0];
            node.scaleY = data.scale[1];
        }
        if (data.angle != null) {
            node.angle = data.angle;
        }
        if (data.skew != null) {
            node.skewX = data.skew[0];
            node.skewY = data.skew[1];
        }

        // 组件实例化
        if (data.components != null) {
            for (let cmpData of data.components) {
                let cmp: SUIComponent = null;
                switch (cmpData.name) {
                    case 'Sprite': cmp = new SUISprite(); break;
                    case 'Label': cmp = new SUILabel(); break;
                    case 'Button': cmp = new SUIButton(); break;
                    case 'Widget': cmp = new SUIWidget(); break;
                    case 'BlockInput': cmp = new SUIBlockInput(); break;
                    case 'Dragger': cmp  = new SUIDragger(); break;
                    default:
                        console.error(`不支持组件：${cmpData.name}`);
                        break;
                }
                cmp.init(node, cmpData, loader);
            }
        }

        // 实例化子结点
        if (data.children != null) {
            for (let childData of data.children) {
                let child = this.instantiate(childData, loader);
                node.addChild(child);
            }
        }
        return node;
    }

    // tslint:disable-next-line: cyclomatic-complexity
    private static genNodeData(node: cc.Node): SNode {
        if (!CC_DEV) {
            return;
        }
        let ret: SNode = new SNode();
        ret.name = node.name;
        if (!node.active) {
            ret.active = false;
        }
        if (!node.color.equals(cc.Color.WHITE)) {
            ret.color = node.color.toHEX('#rrggbb');
        }
        if (node.opacity !== 255) {
            ret.opacity = node.opacity;
        }
        if (node.x !== 0 || node.y !== 0) {
            ret.pos = [node.x, node.y];
        }
        if (node.anchorX !== 0.5 || node.anchorY !== 0.5) {
            ret.anchor = [node.anchorX, node.anchorY];
        }
        if (node.width !== 0 || node.height !== 0) {
            ret.size = [node.width, node.height];
        }
        if (node.scaleX !== 1 || node.scaleY !== 1) {
            ret.scale = [node.scaleX, node.scaleY];
        }
        if (node.angle !== 0) {
            ret.angle = node.angle;
        }
        if (node.skewX !== 0 || node.skewY !== 0) {
            ret.skew = [node.skewX, node.skewY];
        }
        /** 组件数据生成 */
        {
            ret.components = [];
            let cmps: SUIComponent[] = [];
            // 非IQ组件
            if (node.getComponent(cc.Sprite) != null) {
                cmps.push(new SUISprite());
            }
            if (node.getComponent(cc.Label) != null) {
                cmps.push(new SUILabel());
            }
            if (node.getComponent(cc.Button) != null) {
                cmps.push(new SUIButton());
            }
            if (node.getComponent(cc.Widget) != null) {
                cmps.push(new SUIWidget());
            }
            if (node.getComponent(cc.BlockInputEvents) != null) {
                cmps.push(new SUIBlockInput());
            }
            if (node.getComponent(XDragger) != null) {
                cmps.push(new SUIDragger());
            }
            // 组件
            if (cmps.length > 0) {
                for (let cmp of cmps) {
                    let ldCmp = cmp.genData(node);
                    ret.components.push(ldCmp);
                }
            }
            if (ret.components.length === 0) {
                delete ret.components;
            }
        }
        /** 生成子结点 */
        if (node.children.length > 0) {
            ret.children = [];
            for (let child of node.children) {
                ret.children.push(this.genNodeData(child));
            }
        }
        return ret;
    }
}
