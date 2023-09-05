/*******************************************************************************
文件: XScratch.ts
创建: 2020年10月12日
作者: 老张(zwx@xfire.mobi)
描述:
    刮刮卡的【可刮层】组件，刮刮卡【内容层】不要作为【可刮层】子结点。

使用方法：
    1.给结点添加本组件
    2.设置结点宽高
    2.下挂【可刮层】

接口：
    ✦percent，返回擦除百分比估值
    ✦scratchAll，立即刮完
    ✦reset，重置到未刮前
    ✦onScratch，监听刮刮进度
*******************************************************************************/

const {ccclass, property, playOnFocus, executeInEditMode, menu} = cc._decorator;

@ccclass
@executeInEditMode
@menu('XFire/XScratch')
export default class XScratch extends cc.Component {
    // 绑定的banner广告
    @property({
        displayName: CC_DEV && '画笔宽度'
    })
    public lineWidth = 30;

    private mask: cc.Mask = null;
    /** 标记格子已清除 */
    private erasedGrds: boolean[] = [false];
    private erasedCount = 0;
    private gridXCount = 1;
    private gridYCount = 1;
    private gridSize = 5;
    /** 刮刮卡进度回调 */
    private cbPercent: (percent: number) => void;

    public onLoad () {
        this.mask = this.node.getComponent(cc.Mask);
        if (this.mask == null) {
            this.mask = this.node.addComponent(cc.Mask);
        }
        (this.mask as any)._createGraphics();

        // 屏蔽原始绘图
        (this.mask as any)._updateGraphics = () => {};
        // 修正点击测试
        let oldHitTest: Function = (this.mask as any)._hitTest;
        (this.mask as any)._hitTest = (cameraPt) => {
            this.mask.inverted = false;
            let ret = oldHitTest.call(this.mask, cameraPt);
            this.mask.inverted = true;
            return ret;
        };
        this.mask.type = cc.Mask.Type.RECT;
        this.mask.inverted = true;

        // 事件
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    public start() {
        this.gridXCount = Math.max(1, Math.ceil(this.node.width / this.gridSize));
        this.gridYCount = Math.max(1, Math.ceil(this.node.height / this.gridSize));
        this.erasedGrds = new Array<boolean>(this.gridXCount * this.gridYCount);
    }

    /** 立即刮完，不会触发onScratch */
    public scratchAll() {
        let graphics: cc.Graphics = (this.mask as any)._graphics;
        let color = cc.color(0, 0, 0, 0);

        let left = -this.node.anchorX * this.node.width;
        let right = left + this.node.width;
        let bottom = -this.node.anchorY * this.node.height;
        let top = bottom + this.node.height;

        graphics.rect(left, bottom, right - left, top - bottom);
        graphics.fillColor = color;
        graphics.fill();

        this.eraseGrids(left - (-this.node.anchorX * this.node.width), bottom - (-this.node.anchorY * this.node.height), right - left, top - bottom);
    }

    /** 恢复 */
    public reset() {
        let graphics: cc.Graphics = (this.mask as any)._graphics;
        if (graphics) {
            graphics.clear();
        }
        this.erasedGrds = new Array<boolean>(this.gridXCount * this.gridYCount);
        this.erasedCount = 0;
    }

    /** 擦除百分比 */
    public percent(): number {
        return this.erasedCount / (this.gridXCount * this.gridYCount);
    }

    public onScratch(cb: (percent0To1: number) => void) {
        this.cbPercent = cb;
    }

    private onTouchStart(event: cc.Event.EventTouch) {
        let pos = event.touch.getLocation();
        pos = this.mask.node.convertToNodeSpaceAR(pos);
        this.drawRectangle(pos);
    }

    private onTouchMove(event: cc.Event.EventTouch) {
        let pos = event.touch.getLocation();
        pos = this.mask.node.convertToNodeSpaceAR(pos);
        this.drawRectangle(pos);
    }

    private drawRectangle(pos: cc.Vec2) {
        if (this.mask == null) {
            console.error('mask为null');
            return;
        }
        let graphics: cc.Graphics = (this.mask as any)._graphics;
        let color = cc.color(0, 0, 0, 0);

        let left = -this.node.anchorX * this.node.width;
        let right = left + this.node.width;
        let bottom = -this.node.anchorY * this.node.height;
        let top = bottom + this.node.height;

        left = Math.max(left, pos.x - this.lineWidth / 2);
        bottom = Math.max(bottom, pos.y - this.lineWidth / 2);
        right = Math.min(right, left + this.lineWidth);
        top = Math.min(top, bottom + this.lineWidth);
        if (right <= left || top <= bottom) {
            return;
        }
        graphics.rect(left, bottom, right - left, top - bottom);
        graphics.fillColor = color;
        graphics.fill();
        this.eraseGrids(left - (-this.node.anchorX * this.node.width), bottom - (-this.node.anchorY * this.node.height), right - left, top - bottom);
        console.log('haha');
    }

    private eraseGrids(left: number, bottom: number, width: number, height: number) {
        let xStart = Math.floor(left / this.gridSize);
        xStart = Math.max(0, xStart);
        let xEnd = Math.floor((left + width) / this.gridSize);
        xEnd = Math.min(this.gridXCount, xEnd);
        let yStart = Math.floor(bottom / this.gridSize);
        yStart = Math.max(0, yStart);
        let yEnd = Math.floor((bottom + height) / this.gridSize);
        yEnd = Math.min(this.gridYCount, yEnd);
        for (let y = yStart; y <= yEnd; y++) {
            for (let x = xStart; x <= xEnd; x++) {
                let index = y * this.gridXCount + x;
                if (!this.erasedGrds[index]) {
                    this.erasedGrds[index] = true;
                    this.erasedCount++;
                }
            }
        }
        if (this.cbPercent) {
            this.cbPercent(this.percent());
        }
    }
}
