/*******************************************************************************
文件: XAniNumber.ts
创建: 2020年05月27日
作者: 老张(zwx@xfire.mobi)
参考："resources\engine\cocos2d\core\components\CCLabel.js"
描述:
    继承自cc.Label
    ✦支持数字渐变，比如玩家吃到金币了，金币显示标签动态增长到指定值
    ✦支持自行设定数字转换函数，比如将数字转汉字大写、小数位数裁剪、变速
    ✦默认数字取整
    ✦使用接口setNumber可以立即设置数字而不播动画

使用方法：
    ✦结点添加XAniNumber组件，由于继承自cc.Label所以大部分属性跟cc.Label一致
    ✦新增的属性位于组件属性面板下方，不做操作则默认1秒动态变化数字
    ✦代码里拿到组件后参考范例操作即可

范例1：数字更新，默认匀速变化
    label.number += 100;
    label.number -= 200;

范例2：小数位数设定
    label.setNumberTranslator((num: number) => {
        return (Math.floor(num * 100) / 100).toString();
    });

范例3：变速动画，越接近目标值变化越慢
    label.setNumberTranslator((num: number) => {
        let lastNum = label.lastNumber;
        let off = label.number - lastNum;
        let ratio = (1 - label.percentage) * (1 - label.percentage);
        let curNum = lastNum + off * (1 - ratio);
        return Math.floor(curNum).toString();
    });

范例4：数字转中文或其他映射操作
    label.setNumberTranslator((num: number) => {
        let map = '零一二三四五六七八九';
        let ret = '';
        let str = Math.floor(num).toString();
        for (let i = 0; i < str.length; i++) {
            ret += map.charAt(str.charCodeAt(i) - 48);
        }
        return ret;
    });
*******************************************************************************/

const CC_VERSION_24 = cc.ENGINE_VERSION.indexOf('2.4.') === 0;

const { ccclass, property, executeInEditMode, menu } = cc._decorator;

@ccclass
@executeInEditMode
@menu('XFire/XAniNumber')
export default class XAniNumber extends cc.Label {
    @property
    private _dstNumber = 50;
    @property({
        displayName: CC_DEV && '数值',
        tooltip: CC_DEV && '数值',
        visible: CC_DEV && function () {
            return this != null;
        }
    })
    public get number() {
        return this._dstNumber;
    }
    public set number(value: number) {
        if (this._dstNumber !== value) {
            this._lastNumber = this._dstNumber;
            this._dstNumber = value;
            if (!this.animate || CC_EDITOR) {
                this._curNumber = this._dstNumber;
                this.freshText();
            }
            else {
                this.time = this.aniTime;
            }
        }
    }

    @property
    private _animate = true;
    @property({
        displayName: CC_DEV && '开启渐变',
        tooltip: CC_DEV && '开启渐变'
    })
    public get animate(): boolean {
        return this._animate;
    }
    public set animate(value: boolean) {
        this._animate = value;
        if (!value) {
            this._curNumber = this._dstNumber;
            this.freshText();
        }
    }

    @property
    private _aniTime = 1;
    @property({
        displayName: CC_DEV && '渐变时间',
        tooltip: CC_DEV && '渐变时间',
        visible: CC_DEV && function () {
            return this.animate;
        }
    })
    public get aniTime(): number {
        return this._aniTime;
    }
    public set aniTime(value: number) {
        this._aniTime = value;
    }

    /** 将原来的string在属性面板中隐藏掉 */
    @property({
        override: true,
        visible: false
    })
    public get str(): string {
        return this.text;
    }
    public set str(value: string) {
        let oldValue = this.text;
        this.text = '' + value;
        if (this.string !== oldValue) {
            if (CC_VERSION_24) {
                (this as any).setVertsDirty();
            }
            else {
                (this as any)._updateRenderData();
            }
        }
        (this as any)._checkStringEmpty();
    }

    /** 上一次设置的数字，不是指动画上一帧的数字 */
    public get lastNumber() {
        return this._lastNumber;
    }
    /** 当前动画过程中的数字，注意这是Translator转换前数字 */
    public get curNumber() {
        return this._curNumber;
    }
    /** 返回动画已播比例 */
    public get percentage(): number {
        return (this.aniTime - this.time) / this.aniTime;
    }
    private text = '0';
    private _lastNumber = 0;
    private _curNumber = 50;
    private time = 0;
    private numTranslator: (num: number) => string = null;

    public constructor() {
        super();
        this.numTranslator = (num: number) => {
            return Math.floor(num).toString();
        };
    }

    public onLoad() {
        this.freshText();
    }

    /**
     * 设置数值转换函数
     * @param translator 数值转换函数，输入当前数值，返回要显示的字符串
     */
    public setNumberTranslator(translator: (num: number) => string) {
        this.numTranslator = translator;
        this.freshText();
    }

    /** 立即设置数字，没有动画 */
    public setNumberAtOnce(num: number) {
        this._dstNumber = num;
        this._curNumber = num;
        this.time = 0;
        this.freshText();
    }

    public update(dt: number) {
        if (!this.animate || this.time <= 0) {
            return;
        }
        this.time -= dt;
        if (this.time <= 0) {
            this.time = 0;
            this._curNumber = this._dstNumber;
        }
        else {
            let off = this._dstNumber - this.lastNumber;
            this._curNumber = this.lastNumber +
                off * (this.aniTime - this.time) / this.aniTime;
        }
        this.freshText();
    }

    private freshText() {
        this.string = this.numTranslator(this._curNumber);
    }
}
