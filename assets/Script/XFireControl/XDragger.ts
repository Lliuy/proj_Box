/*************************************************************************
文件: XDragger.ts
创建: 2020年04月28日
作者: 老张(zwx@xfire.mobi)
描述:
    对象拖动器
*************************************************************************/

const Event_Press = 'press';
const Event_Start = 'start';
const Event_Move = 'move';
const Event_End = 'end';
const Event_Unpress = 'unpress';

const {ccclass, executeInEditMode, menu, property} = cc._decorator;

@ccclass
@menu('XFire/XDragger')
export default class XDragger extends cc.Component {
    /** 拖动触发距离阈值 */
    @property({
        displayName: CC_DEV && '起始拖动阈值',
        tooltip: CC_DEV && '偏移达到指定值才开始拖动'
    })
    @property
    public dragThreshold = 0;

    @property({
        displayName: CC_DEV && '实时修订位置',
        tooltip: CC_DEV && '拖动时每帧刷新都设置下位置'
    })
    @property
    public realtimeSet = false;

    @property
    public _up = true;
    @property({
        displayName: CC_DEV && '允许上移',
        tooltip: CC_DEV && '描述',
        visible: CC_DEV && function() {
            return this != null;
        }
    })
    public get up() {
        return this._up;
    }
    public set up(value: boolean) {
        this._up = value;
    }

    @property
    public _down = true;
    @property({
        displayName: CC_DEV && '允许下移',
        visible: CC_DEV && function() {
            return this != null;
        }
    })
    public get down() {
        return this._down;
    }
    public set down(value: boolean) {
        this._down = value;
    }

    @property
    public _left = true;
    @property({
        displayName: CC_DEV && '允许左移',
        visible: CC_DEV && function() {
            return this != null;
        }
    })
    public get left() {
        return this._left;
    }
    public set left(value: boolean) {
        this._left = value;
    }

    @property
    public _right = true;
    @property({
        displayName: CC_DEV && '允许右移',
        visible: CC_DEV && function() {
            return this != null;
        }
    })
    public get right() {
        return this._right;
    }
    public set right(value: boolean) {
        this._right = value;
    }

    /** 触摸起始位置 */
    public get touchBegin() {
        return this._touchBegin.clone();
    }

    public get touchCur() {
        return this._touchCur.clone();
    }

    /** 物体初始位置 */
    public get nodeBeginPos() {
        return this._nodeBeginPos.clone();
    }

    /** 当前偏移，可以在onMove的回调中使用 */
    public get curOff() {
        return this._curOff.clone();
    }

    /** 累计偏移 */
    public get totalOff() {
        return this._touchCur.sub(this._touchBegin);
    }

    /** 是否在拖动中 */
    public get moving() {
        return this._moving;
    }

    /** 触摸起始位置 */
    private _touchBegin: cc.Vec2 = cc.Vec2.ZERO;
    /** 触摸当前位置 */
    private _touchCur: cc.Vec2 = cc.Vec2.ZERO;
    /** 触摸id */
    private touchId = -1;
    /** 物体初始位置 */
    private _nodeBeginPos: cc.Vec2 = cc.Vec2.ZERO;
    /** 物体目标位置 */
    private dstPos: cc.Vec2 = cc.Vec2.ZERO;
    /** 已经启动移动 */
    private _moving = false;
    /** 回调处理 */
    private callbacks: cc.EventTarget = new cc.EventTarget();
    /** 当前偏移，可以在onMove的回调中使用 */
    private _curOff: cc.Vec2 = cc.Vec2.ZERO;

    public onLoad() {
    }

    public start () {
    }

    public onEnable() {
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    public onDisable() {
        this.touchId = -1;
        this.node.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    public update(dt: number) {
        if (this.realtimeSet && this.touchId >= 0) {
            this.node.setPosition(this.dstPos);
        }
    }

    /**
     * 等待拖动到某个区域
     * @param dst           目标位置
     * @param radius        目标区域半径，进入半径范围即视为成功
     * @param anchorNode    为空，dst采用当前父结点坐标系
     * @example
     * waitforDragTo(cc.v2(100, 100), 20)
     */
    public waitforDragTo(dst: cc.Vec2, radius: number, anchorNode: cc.Node = null): Promise<void> {
        return new Promise<void> ((resolve) => {

        });
    }

    /** 触摸按下 */
    public onPress(cb: (dragger: XDragger) => void) {
        this.callbacks.on(Event_Press, cb);
    }

    public offPress(cb: (dragger: XDragger) => void) {
        this.callbacks.off(Event_Press, cb);
    }

    /** 触摸弹起 */
    public onUnpress(cb: (dragger: XDragger) => void) {
        this.callbacks.on(Event_Unpress, cb);
    }

    public offUnpress(cb: (dragger: XDragger) => void) {
        this.callbacks.off(Event_Unpress, cb);
    }

    /** 开始触发移动时回调 */
    public onStart(cb: (dragger: XDragger) => void) {
        this.callbacks.on(Event_Start, cb);
    }

    public offStart(cb: (dragger: XDragger) => void) {
        this.callbacks.off(Event_Start, cb);
    }

    /** 回调时机为node位置已经设置好 */
    public onMove(cb: (dragger: XDragger) => void) {
        this.callbacks.on(Event_Move, cb);
    }

    public offMove(cb: (dragger: XDragger) => void) {
        this.callbacks.off(Event_Move, cb);
    }

    /** 结束移动时回调 */
    public onEnd(cb: (dragger: XDragger) => void) {
        this.callbacks.on(Event_End, cb);
    }

    public offEnd(cb: (dragger: XDragger) => void) {
        this.callbacks.off(Event_End, cb);
    }

    private trigger(off: cc.Vec2) {
        /**
         * 这里为啥使用父结点转换？因为我们就是要移动当前结点在父结点中的位置。如果使用当前结点，那么
         * 如果当前结点有缩放，就会出错
         */
        this.dstPos = this.node.parent.convertToNodeSpaceAR(this._nodeBeginPos.add(off));
        this.node.setPosition(this.dstPos);

        this.callbacks.emit(Event_Move, this);
    }

    private onTouchStart(event: cc.Event.EventTouch) {
        event.stopPropagation();
        this._touchBegin = event.getLocation();
        this.touchId = event.getID();
        this._nodeBeginPos = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO);
        this.dstPos = this.node.getPosition();
        this._curOff = cc.Vec2.ZERO;
        this._touchCur = this._touchBegin.clone();
        this.callbacks.emit(Event_Press, this);
    }

    private onTouchMove(event: cc.Event.EventTouch) {
        event.stopPropagation();
        if (event.getID() !== this.touchId) {
            return;
        }
        let lastOff = this.totalOff;
        this._touchCur = event.getLocation();
        let off = event.getLocation().sub(this._touchBegin);
        if (!this._moving) {
            if (off.magSqr() < this.dragThreshold * this.dragThreshold) {
                return;
            }
            this._moving = true;
            this.callbacks.emit(Event_Start, this);
        }
        this._curOff = this.totalOff.sub(lastOff);
        if (!this.up) {
            off.y = Math.min(0, off.y);
        }
        if (!this.down) {
            off.y = Math.max(0, off.y);
        }
        if (!this.left) {
            off.x = Math.max(0, off.x);
        }
        if (!this.right) {
            off.x = Math.min(0, off.x);
        }
        this.trigger(off);
    }

    private onTouchEnd(event: cc.Event.EventTouch) {
        event.stopPropagation();
        if (event.getID() !== this.touchId) {
            return;
        }
        let moving = this._moving;
        this.touchId = -1;
        this._moving = false;
        this._curOff = cc.Vec2.ZERO;
        /** 没有移动过不触发移动结束事件 */
        if (moving) {
            this.callbacks.emit(Event_End, this);
        }
        this.callbacks.emit(Event_Unpress, this);
    }

}
