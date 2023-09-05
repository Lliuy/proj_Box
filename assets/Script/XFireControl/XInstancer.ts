/*************************************************************************
文件: XInstancer.ts
创建: 2020年4月9日
作者: 老张(zwx@xfire.mobi)
描述:
    当前cocos不支持预制体中嵌套预制体，强行拖入会直接实例化，断开预制体的同步。
    为了解决这个问题，撰写本组件，实现间接的嵌套。
    实例化出来的结点挂为本组件所在结点子结点，名字为'inst'。

    好处：
    1.可以方便ui编辑阶段的预制体嵌套、复用。
    2.ui编辑阶段就能看到组装效果。
    3.省去程序的手动创建预制体步骤（仍需手动获取创建出的结点）。

使用方法：
    给结点绑定本组件，设置需要实例化的预制体，可设置一个字符串类型的实例化参数。
    在预制体组件里，可以使用XInstancer.getInstParam来获取实例化参数。

范例：
    // 直接根据XInstancer获取实例化结点
    cmpXInstancer.inst

    // 在预制体绑定脚本中获取实例化参数
    public onLoad () {
        console.log(XInstancer.getInstParam(this));
    }

*************************************************************************/

const {ccclass, menu, executeInEditMode, property} = cc._decorator;

@ccclass
@executeInEditMode
@menu('XFire/XInstancer')
export default class XInstancer extends cc.Component {
    /**
     * 获取实例化时传入的参数
     * @param node 被实例化出来的结点
     */
    public static getInstParam(node: cc.Node | cc.Component): string {
        let lNode = node instanceof (cc.Node) ? (node as cc.Node) : (node as cc.Component).node;
        if (lNode == null) {
            return null;
        }
        return (lNode as any)._xInstParam;
    }

    @property
    public _prefab: cc.Prefab = null;
    @property({
        type: cc.Prefab,
        visible: true,
        displayName: '预制体'
    })
    public set prefab(value: cc.Prefab) {
        this._prefab = value;
        this.reinstantiate();
    }

    public get prefab(): cc.Prefab {
        return this._prefab;
    }

    @property({
        displayName: CC_DEV && 'start时实例化',
        tooltip: CC_DEV && '有些如物理组件结点需在start中实例化才有效'
    })
    public  instantiateOnStart = false;

    @property({
        displayName: CC_DEV && '自定义数据'
    })
    public instParam = '';

    public inst: cc.Node = null;

    public onLoad() {
        if (!this.instantiateOnStart) {
            this.reinstantiate();
        }
    }

    public start () {
        if (this.instantiateOnStart) {
            this.reinstantiate();
        }
    }

    private reinstantiate() {
        if (this.inst) {
            this.inst.destroy();
            this.inst = null;
        }
        if (!this._prefab) {
            return;
        }
        this.inst = cc.instantiate(this._prefab);
        if (this.inst) {
            if (CC_EDITOR) {
                (this.inst as any)._objFlags |= (cc as any).Object.Flags.DontSave;
                (this.inst as any)._objFlags |= (cc as any).Object.Flags.LockedInEditor;
                (this.inst as any)._objFlags |= (cc as any).Object.Flags.HideInHierarchy;
            }
            this.inst.zIndex = cc.macro.MIN_ZINDEX;
            this.inst.name = 'inst';
            (this.inst as any)._xInstParam = this.instParam;
            this.node.addChild(this.inst);
        }
    }

}
