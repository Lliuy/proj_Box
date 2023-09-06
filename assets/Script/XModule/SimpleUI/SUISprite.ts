/*******************************************************************************
文件: SUISprite.ts
创建: 2021年03月17日
作者: 老张(zwx@xfire.mobi)
描述:
    针对Sprite的导出、导入
*******************************************************************************/

import SUIComponent from './SUIComponent';
import { SControl, SNode } from './SUIData';
import SUIResLoader from './SUIResLoader';

export default class SUISprite extends SUIComponent {
    public init(node: cc.Node, data: SControl, loader: SUIResLoader): void {
        let sprite = node.getComponent(cc.Sprite);
        if (sprite == null) {
            sprite = node.addComponent(cc.Sprite);
        }
        if (sprite != null && data.properties != null) {
            if (data.properties.type != null) {
                sprite.type = data.properties.type;
            }
            let sliced = sprite.type === cc.Sprite.Type.SLICED && data.properties.slice != null;

            if (data.properties.sizeMode != null) {
                sprite.sizeMode = data.properties.sizeMode;
            }
            if (data.properties.image != null) {
                (async () => {
                    if (data.properties.image === '') {
                        sprite.spriteFrame = null;
                    }
                    else {
                        let frame = await loader.loadImage(data.properties.image, data.properties.ext || '.png');
                        // 判断下是否已经设置了图片，放置网速慢，外部已经先行进行了图片更换
                        if (sprite.spriteFrame == null) {
                            if (sliced) {
                                let newFrame = new cc.SpriteFrame();
                                newFrame.name = frame.name;
                                let slice = data.properties.slice;
                                newFrame.setTexture(frame.getTexture(), frame.getRect(), frame.isRotated(), frame.getOffset(), frame.getOriginalSize());
                                newFrame.insetLeft = slice[0];
                                newFrame.insetTop = slice[1];
                                newFrame.insetRight = slice[2];
                                newFrame.insetBottom = slice[3];
                                frame = newFrame;
                            }
                            sprite.spriteFrame = frame;
                        }
                    }
                })();
            }
        }
    }

    public genData(node: cc.Node): SControl {
        if (!CC_DEV) {
            if (CC_PREVIEW) console.log('SUISprite genData仅开发环境使用');
            return;
        }
        let sprite = node.getComponent(cc.Sprite);
        if (sprite == null) {
            console.error('结点未添加cc.Sprite组件');
            return;
        }
        let cmp = new SControl();
        cmp.name = 'Sprite';
        if (!sprite.enabled) {
            cmp.enabled = false;
        }
        let ext: string;
        if ((sprite as any)._textureFilename != null && (sprite as any)._textureFilename.endsWith('.jpg')) {
            ext = '.jpg';
        }
        cmp.properties = {
            image: sprite.spriteFrame == null ? '' : sprite.spriteFrame.name,
            type: sprite.type,
            sizeMode: sprite.sizeMode,
            ext
        };
        if (sprite.type === cc.Sprite.Type.SLICED && sprite.spriteFrame != null) {
            cmp.properties.slice = [
                sprite.spriteFrame.insetLeft,
                sprite.spriteFrame.insetTop,
                sprite.spriteFrame.insetRight,
                sprite.spriteFrame.insetBottom
            ];
        }
        return cmp;
    }
}
