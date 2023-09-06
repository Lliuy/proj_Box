/*******************************************************************************
文件: SUIData.ts
创建: 2021年03月17日
作者: 老张(zwx@xfire.mobi)
描述:
    SimpleUI相关数据
*******************************************************************************/

/** 结点信息存储格式 */
export class SNode {
    /** 名称 */
    public name: string;
    /** 激活状态 */
    public active?: boolean;
    /** 颜色 */
    public color?: string;
    /** 透明度0-255 */
    public opacity?: number;
    /** 坐标 */
    public pos?: number[];
    /** 锚点 */
    public anchor?: number[];
    /** 尺寸 */
    public size?: number[];
    /** 缩放 */
    public scale?: number[];
    /** 角度 */
    public angle?: number;
    /** 扭曲 */
    public skew?: number[];
    /** 组件 */
    public components?: SControl[];
    /** 子结点 */
    public children?: SNode[];
}

/** 控件信息存储格式 */
export class SControl {
    /** 组件名 */
    public name: string;
    /** 是否激活 */
    public enabled?: boolean;
    /** 组件属性 */
    public properties?: {[key: string]: any};
}
