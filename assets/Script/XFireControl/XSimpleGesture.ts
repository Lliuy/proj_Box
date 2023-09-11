/*************************************************************************
文件: XSimpleGesturePad.ts
创建: 2020年03月12日
作者: 老张(zwx@xfire.mobi)
描述:
    简单手势识别，支持滑动触发、触摸结束触发
    现在支持4个方向：左滑、上滑、右滑、下滑
    onGesture         注册监听函数
    offGesture        取消监听函数
    waitforGesture    异步等待某个手势，可以做引导，等待用户输入特定手势

使用方法：
    给结点绑定本组件，设置结点的大小，即为可触摸范围。

范例：
    // 监听
    this.gesturePad.onGesture((gesture) => {
        let toast = '';
        switch (gesture) {
            case Gesture.SlideLeft:  toast = '左滑';  break;
            case Gesture.SlideUp:    toast = '上滑';  break;
            case Gesture.SlideRight: toast = '右滑';  break;
            case Gesture.SlideDown:  toast = '下滑';  break;
        }
        App.getInstance().showToast(toast);
    });

    // 异步等待
    (async () => {
        await this.gesturePad.waitforGesture(Gesture.SlideRight);
        App.getInstance().showToast('用户右滑了');
        await this.gesturePad.waitforGesture(Gesture.SlideDown);
        App.getInstance().showToast('用户下滑了');
    })();
*************************************************************************/

import xfire from "../XFire/xfire";

const {ccclass, executeInEditMode, menu, property} = cc._decorator;

export enum Gesture {
    SlideLeft = 1,
    SlideUp = 2,
    SlideRight = 3,
    SlideDown = 4
}

@ccclass
@executeInEditMode
@menu('XFire/XSimpleGesture')
export default class XSimpleGesture extends cc.Component {
    @property({
        displayName: CC_DEV && '滑动阈值'
    })
    @property
    public slideThreshold = 30;         // 手势滑动触发距离阈值

    @property({
        displayName: CC_DEV && '手指抬起后触发'
    })
    public triggerOnTouchEnd = false;   // 触发时机，true表在触摸结束时触发

    @property
    public _previewRegionInEditor = true;
    @property({
        displayName: CC_DEV && '编辑器预览操作区域',
        tooltip: CC_DEV && '编辑器预览操作区域'
    })
    public get previewRegionInEditor() {
        return this._previewRegionInEditor;
    }
    public set previewRegionInEditor(value: boolean) {
        this._previewRegionInEditor = value;
        if (CC_EDITOR) {
            this.node.emit('refreshPreview');
        }
    }

    private touchX = 0;
    private touchY = 0;
    private touchId = -1;
    private cbs: ((gesture: Gesture) => void)[] = [];      // 外部注册监听函数
    private innerCbs: ((gesture: Gesture) => void)[] = []; // 内部注册监听函数

    public onLoad() {
        if (CC_EDITOR) {
            let cb = () => {
                if (this.node.width === 0 || this.node.height === 0) {
                    this.node.width = 100;
                    this.node.height = 100;
                }
                // 结点创建
                let nodePreview = this.node.getChildByName('预览用 不保存 勿修改');
                if (nodePreview == null) {
                    nodePreview = new cc.Node('预览用 不保存 勿修改');
                    nodePreview.parent = this.node;
                    nodePreview.zIndex = cc.macro.MAX_ZINDEX;
                    nodePreview.opacity = 64;
                    nodePreview.color = cc.Color.RED;
                    (nodePreview as any)._objFlags |= (cc as any).Object.Flags.DontSave;
                    (nodePreview as any)._objFlags |= (cc as any).Object.Flags.HideInHierarchy;
                    (nodePreview as any)._objFlags |= (cc as any).Object.Flags.LockedInEditor;
                    let cmp = nodePreview.addComponent(cc.Sprite);
                    cmp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                    (cc as any).AssetLibrary.loadAsset('a23235d1-15db-4b95-8439-a2e005bfff91', (err, asset) => {
                        if (asset instanceof cc.SpriteFrame) {
                            cmp.spriteFrame = asset;
                        }
                    });
                }
                nodePreview.anchorX = this.node.anchorX;
                nodePreview.anchorY = this.node.anchorY;
                nodePreview.width = this.node.width;
                nodePreview.height = this.node.height;
                nodePreview.active = this.previewRegionInEditor;
            };

            this.node.on('refreshPreview', cb, this);
            this.node.on(cc.Node.EventType.SIZE_CHANGED, cb, this);
            this.node.on(cc.Node.EventType.ANCHOR_CHANGED, cb, this);
            cb();
        }
    }

    public start () {
        this.node.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
            this.touchX = event.getLocationX();
            this.touchY = event.getLocationY();
            this.touchId = event.getID();
        });
        this.node.on(cc.Node.EventType.TOUCH_MOVE, (event: cc.Event.EventTouch) => {
            if (this.triggerOnTouchEnd || event.getID() !== this.touchId) {
                return;
            }
            let offx = event.getLocationX() - this.touchX;
            let offy = event.getLocationY() - this.touchY;
            if ((offx * offx + offy * offy) < this.slideThreshold * this.slideThreshold) {
                return;
            }

            this.touchId = -1;
            this.trigger(offx, offy);
        });
        this.node.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) => {
            if (!this.triggerOnTouchEnd || event.getID() !== this.touchId) {
                return;
            }
            let offx = event.getLocationX() - this.touchX;
            let offy = event.getLocationY() - this.touchY;
            if ((offx * offx + offy * offy) < this.slideThreshold * this.slideThreshold) {
                return;
            }
            this.touchId = -1;
            this.trigger(offx, offy);
        });
    }

    /**
     * 注册手势监听，可以多个
     * @param cb 回调函数，参数gesture表手势
     */
    public onGesture(cb: (gesture: Gesture) => void) {
        this._onGesture(cb, false);
    }

    /**
     * 取消手势监听
     * @param cb 回调函数，为空则清楚所有监听函数
     */
    public offGesture(cb: (direction: Gesture) => void) {
        this._offGesture(cb, false);
    }

    /**
     * 等待接收到指定手势，如用于引导
     * @param gesture 要等待接收的手势
     */
    public waitforGesture(gesture: Gesture): Promise<void> {
        return new Promise<void> ((resolve) => {
            let cb = (igesture: Gesture) => {
                if (igesture === gesture) {
                    this._offGesture(cb, true);
                    resolve();
                }
            };
            this._onGesture(cb, true);
        });
    }

    private _onGesture(cb: (gesture: Gesture) => void, inner: boolean) {
        let cbs = inner ? this.innerCbs : this.cbs;
        if (cbs.indexOf(cb) >= 0) {
            return;
        }
        cbs.push(cb);
    }

    private _offGesture(cb: (gesture: Gesture) => void, inner: boolean) {
        if (cb == null) {
            if (inner) {
                this.innerCbs = [];
            }
            else {
                this.cbs = [];
            }
            return;
        }
        let cbs = inner ? this.innerCbs : this.cbs;
        for (let i = 0, len = cbs.length; i < len; i++) {
            if (cbs[i] === cb) {
                cbs.splice(i, 1);
                break;
            }
        }
    }

    private trigger(offx: number, offy: number) {
        let gesture: Gesture;
        if (offx > 0 && Math.abs(offy) <= offx) {
            gesture = Gesture.SlideRight;
        }
        else if (offx < 0 && Math.abs(offy) <= (-offx)) {
            gesture = Gesture.SlideLeft;
        }
        else if (offy > 0) {
            gesture = Gesture.SlideUp;
        }
        else {
            gesture = Gesture.SlideDown;
        }

        let toTriggerInnerCbs = xfire.copy(this.innerCbs);
        let toTriggerCbs = xfire.copy(this.cbs);

        toTriggerInnerCbs.forEach((cb) => {
            cb(gesture);
        });
        toTriggerCbs.forEach((cb) => {
            cb(gesture);
        });
    }
}
