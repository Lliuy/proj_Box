/*******************************************************************************
文件: FakeInput.ts
创建: 2020年05月26日
作者: 老张(zwx@xfire.mobi)
参考：
    https://github.com/ShawnZhang2015/GodGuide/blob/master/assets/GodGuide/GodGuide.js
    "C:\CocosCreator_2.1.4\resources\engine\cocos2d\core\platform\CCInputManager.js"
    "C:\CocosCreator_2.1.4\resources\engine\cocos2d\core\event-manager\CCTouch.js"
描述:
    实现用户输入模拟

    触摸模拟
    touchStart       模拟触摸开始
    touchMove        模拟触摸移动
    touchEnd         模拟触摸结束
    touchClick       模拟点击

*******************************************************************************/

const inputManager = (window as any)._cc ? (window as any)._cc.inputManager :
    (cc as any).internal.inputManager;

export default class FakeInput {

    /**
     * 模拟触摸开始
     * @param pos 点击的逻辑位置（单位：游戏内逻辑像素），屏幕左下角为原点
     * @example
     * let touch = FakeTouch.touchStart(this.node.convertToWorldSpaceAR(cc.Vec2.ZERO));
     */
    public static touchStart(pos: cc.Vec2): cc.Touch {
        let { pt, region } = FakeInput.convertGameToDevice(pos);
        let touch = inputManager.getTouchByXY(pt.x, pt.y, region);
        (touch as any)._imfake = true;
        inputManager.handleTouchesBegin([touch]);
        return touch;
    }

    /**
     * 模拟触摸移动
     * @param _touch 触摸信息，来自start返回
     * @param pos 当前位置（单位：游戏内逻辑像素），屏幕左下角为原点
     * @example
     * FakeInput.touchMove(touch, cc.v2(600, pos));
     */
    public static touchMove(touch: cc.Touch, pos: cc.Vec2) {
        let { pt, region } = FakeInput.convertGameToDevice(pos);
        pt = cc.view.convertToLocationInView(pt.x, pt.y, region);
        (touch as any)._setPoint(pt);
        inputManager.handleTouchesMove([touch]);
    }

    /**
     * 模拟触摸结束
     * @param touch 触摸信息，来自start返回
     * @example
     * FakeInput.touchEnd(touch);
     */
    public static touchEnd(touch: cc.Touch) {
        inputManager.handleTouchesEnd([touch]);
    }

    /**
     *
     * @param pos 点击位置
     * @param endDelay 多久后结束触摸，触发click
     * @example
     * FakeInput.touchClick(this.node.convertToWorldSpaceAR(cc.Vec2.ZERO));
     */
    public static touchClick(pos: cc.Vec2, endDelay = 0.2) {
        let touch = FakeInput.touchStart(pos);
        setTimeout(() => {
            FakeInput.touchEnd(touch);
        }, endDelay * 1000);
    }

    private static getHTMLElementPosition(element) {
        let docElem = document.documentElement;
        let leftOffset = window.pageXOffset - docElem.clientLeft;
        let topOffset = window.pageYOffset - docElem.clientTop;
        if (typeof element.getBoundingClientRect === 'function') {
            let box = element.getBoundingClientRect();
            return {
                left: box.left + leftOffset,
                top: box.top + topOffset,
                width: box.width,
                height: box.height
            };
        }
        else {
            if (element instanceof HTMLCanvasElement) {
                return {
                    left: leftOffset,
                    top: topOffset,
                    width: element.width,
                    height: element.height
                };
            }
            else {
                return {
                    left: leftOffset,
                    top: topOffset,
                    width: parseInt(element.style.width, 10),
                    height: parseInt(element.style.height, 10)
                };
            }
        }
    }

    /**
     * 将游戏坐标转换到设备坐标(左上角为原点，单位：点)
     * @param pos 游戏内逻辑坐标，以屏幕左下角为原点
     */
    private static convertGameToDevice(pos: cc.Vec2): { pt: cc.Vec2; region: { width: number; height: number; left: number; top: number } } {
        let region: { width: number; height: number; left: number; top: number } = null;
        if (cc.sys.isBrowser) {
            let canvas = document.getElementById('GameCanvas');
            region = FakeInput.getHTMLElementPosition(canvas);
        } else {
            let size = cc.view.getFrameSize();
            region = { left: 0, top: 0, width: size.width, height: size.height };
        }
        let vp = cc.view.getViewportRect();
        let sx = cc.view.getScaleX();
        let sy = cc.view.getScaleY();
        let ratio = cc.view.getDevicePixelRatio();
        let htmlx = (pos.x * sx + vp.x) / ratio + region.left;
        let htmly = region.top + region.height - (pos.y * sy + vp.y) / ratio;
        let pt = cc.v2(htmlx, htmly);

        return { pt, region };
    }
}
