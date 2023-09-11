/**
 * 炫火
 * 引擎能力扩展
 */

import xfire from "../XFire/xfire";

 // tslint:disable
let XEngineExt = {
    
    /**
     * 扩展多点触摸机制
     * @param requireFirstTouch 竞争用户的首次触摸
     * @param acceptMultiTouch 表示允许多点触摸
     */
    extendNodeMutiTouch(requireFirstTouch = true, acceptMultiTouch = false) {
        let cls: any = cc.Node;
        let proto: any = cc.Node.prototype;
        cls.extFirstTouchId = -1;
        cls.extTouchingIds = [];
        proto.extRequireFirstTouch = requireFirstTouch;
        proto.extAcceptMultiTouch = acceptMultiTouch;
        proto.extTouchingIds = [];

        // event.getTouches()只在touchmove时获取才有效
        let oldDispatchEvent = cc.Node.prototype.dispatchEvent;

        cc.Node.prototype.dispatchEvent = function (event: any) {
            // 全局管理
            if (event.type === 'touchstart') {
                if (cls.extTouchingIds.length === 0) {
                    cls.extFirstTouchId = event.touch.getID();
                    cls.extTouchingIds.push(cls.extFirstTouchId);
                }
                else if (cls.extTouchingIds.indexOf(event.touch.getID()) === -1) {
                    cls.extTouchingIds.push(event.touch.getID());
                }
            }
            else if (event.type === 'touchend' || event.type === 'touchcancel') {
                let index = cls.extTouchingIds.indexOf(event.touch.getID());
                if (index >= 0) {
                    cls.extTouchingIds.splice(index, 1);
                }
            }
            else if (event.type === 'touchmove') {
                let touches = event.getTouches();
                let curIds = [];
                for (let touch of event.getTouches()) {
                    curIds.push(touch.getID());
                }
                // 尝试清理
                let validIds = [];
                for (let id of this.extTouchingIds) {
                    if (curIds.indexOf(id) >= 0) {
                        validIds.push(id);
                    }
                }
                this.extTouchingIds = validIds;
            }

            // 结点管理
            switch (event.type) {
                case 'touchstart':
                case 'touchmove':
                case 'touchend':
                case 'touchcancel':
                    if (event.type === 'touchstart') {
                        let allow = false;
                        // 全局首点击 直接允许
                        if (cls.extTouchingIds.length === 1) {
                            this.extTouchingIds = [];
                            allow = true;
                        }
                        // 排除只要首点的情况
                        else if (this.extRequireFirstTouch && !this.extAcceptMultiTouch) {
                        }
                        // 强制要求首次点击、支持多点触摸
                        else if (this.extRequireFirstTouch && this.acceptMultiTouch) {
                            // 确保首次点击已在列表中
                            if (this.extTouchingIds.length > 0) {
                                allow = true;
                            }
                        }
                        // 不强制要求首次点击、不支持多点触摸
                        else if (!this.extRequireFirstTouch && !this.extAcceptMultiTouch) {
                            if (this.extTouchingIds.length === 0) {
                                allow = true;
                            }
                        }
                        // 不强制要求首次点击、支持多点触摸
                        else if (!this.extRequireFirstTouch && this.extAcceptMultiTouch) {
                            allow = true;
                        }
                        if (!allow) {
                            return;
                        }
                        this.extTouchingIds.push(event.touch.getID());
                    }
                    let touchId = event.touch.getID();
                    let index = this.extTouchingIds.indexOf(touchId);
                    if (index >= 0 && event.type === 'touchend' && event.type === 'touchcancel') {
                        this.extTouchingIds.splice(index, 1);
                    }
                    if (index >= 0) {
                        oldDispatchEvent.call(this, event);
                    }
                    break;
                default:
                    oldDispatchEvent.call(this, event);
            }
        };
    },
    
    /**
     * 扩展按钮，统一监听按下，点击事件，例如用于统一添加音效
     * TypeData为自定义数据类型
     * 范例：
     * export function overrideButton(): void {
     *     XEngineExt.extendButton(true, (button, data) => {
     *         if (data) {
     *             playSound('按钮');
     *         }
     *     });
     * }
     * 
     * export function muteButton(button: cc.Button): void {
     *     XEngineExt.setButtonCustomData(button, false);
     * }
     * 
     * export function unmuteButton(button: cc.Button): void {
     *     XEngineExt.setButtonCustomData(button, true);
     * }
     * 
     * @param defaultData 扩展的数据默认值
     * @param onPress 按下事件 可null
     * @param onClick 点击事件 可null
     */
    extendButton<TypeData>(defaultData: TypeData, onPress: (button: cc.Button, data: TypeData) => void, onClick: (button: cc.Button, data: TypeData) => void = null) {
        let cls: any = cc.Button;
        let proto: any = cc.Button.prototype;
        proto.extCustomData = xfire.copy(defaultData);

        let oldOnTouchBegan = proto._onTouchBegan;
        let oldOnTouchEnded = proto._onTouchEnded;
        proto._onTouchBegan = function(event) {
            oldOnTouchBegan.call(this, event);
            if (this._pressed && onPress) {
                onPress(this, this.extCustomData);
            }
        };
        proto._onTouchEnded = function(event) {
            let isPressed = this._pressed;
            oldOnTouchEnded.call(this, event);
            if (isPressed && !this._pressed && onClick) {
                onClick(this, this.extCustomData);
            }
        };
        // 下方为未封装的旧写法 保留供参考 [2019年11月14日 老张]
        /*
        let proto = cc.js.getClassByName('cc.Button').prototype;
        if (proto == undefined || typeof proto._onTouchBegan !== 'function' || typeof proto._onTouchEnded !== 'function') {
            console.log('error:overrideButton');
            return;
        }

        proto._old_onTouchBegan = proto._onTouchBegan;
        proto._old_onTouchEnded = proto._onTouchEnded;
        proto._sound_mute = false;
        proto._onTouchBegan = function(event) {
            this._old_onTouchBegan(event);
            if (this._pressed && !this._sound_mute) {
                playSound('按钮');
            }
        };
        proto._onTouchEnded = function(event) {
            let isPressed = this._pressed;
            this._old_onTouchEnded(event);
            if (isPressed && !this._pressed) {
                // playSound("按钮弹起");
            }
        };*/
    },
    /**
     * 获取按钮的自定义数据
     * @param button 按钮
     */
    getButtonCustomData<TypeData>(button: cc.Button): TypeData {
        return (button as any).extCustomData;
    },
    /**
     * 设置按钮的自定义数据
     * @param button 
     * @param data 
     */
    setButtonCustomData<TypeData>(button: cc.Button, data: TypeData) {
        (button as any).extCustomData = xfire.copy(data);
    }
};
// tslint:enable

export default XEngineExt;
