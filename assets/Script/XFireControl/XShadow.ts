/*************************************************************************
文件: XShadow.ts
创建: 2020年05月18日
作者: 老张(zwx@xfire.mobi)
描述:
    生成结点实时投影

用途范例1：黑色阴影
    ✦绑定好对象后，设置sprite的blend的SrcBlendFactor为zero即可
    ✦如果需要调节柔和度，可以设置结点的透明度

用途范例2：残影
    ✦设置多个阴影，调节不同的透明度

用途范例3：放大镜
    ✦新建一个结点NodeZoom
    ✦给NodeZoom添加Mask组件，设置圆形
    ✦给NodeZoom添加一个子结点，并添加XShadow组件
    ✦给XShadow组件绑定渲染对象
*************************************************************************/

const {ccclass, executeInEditMode, menu, property, requireComponent} = cc._decorator;

@ccclass
@executeInEditMode
@requireComponent(cc.Sprite)
@menu('XFire/XShadow')
export default class XShadow extends cc.Component {

    @property({
        type: cc.Node,
        displayName: CC_DEV && '渲染对象',
        tooltip: CC_DEV && '渲染对象，为空为当前结点'
    })
    public nodeTarget: cc.Node = null;

    @property({
        displayName: CC_DEV && '视点位置',
        tooltip: CC_DEV && '视点位置，锚定对象坐标系'
    })
    public lookatPos = cc.Vec2.ZERO;

    /** 用于渲染到纹理的摄像机 */
    private camera: cc.Camera = null;
    /** 用来挂载摄像机的子结点 */
    private nodeCamera: cc.Node = null;
    /** 渲染纹理 */
    private renderTexture: cc.RenderTexture = null;

    public onLoad () {
        let node = new cc.Node();
        this.camera = node.addComponent(cc.Camera);
        node.parent = this.node;
        this.nodeCamera = node;
        if (CC_EDITOR) {
            // 不保存
            (node as any)._objFlags |= (cc as any).Object.Flags.DontSave;
            // 不显示在编辑器的树结构中
            (node as any)._objFlags |= (cc as any).Object.Flags.HideInHierarchy;
            // 不可点击
            (node as any)._objFlags |= (cc as any).Object.Flags.LockedInEditor;
            node.name = '预览用 不保存 勿修改';
        }

        this.renderTexture = new cc.RenderTexture();
        let gl = (cc as any).game._renderContext;
        // 此处的STENCIL_INDEX8干啥的？如果没有将无法正确渲染有裁剪区域的对象
        this.renderTexture.initWithSize(this.node.width, this.node.height, gl.STENCIL_INDEX8);
        this.camera.targetTexture = this.renderTexture;
        this.camera.cullingMask = 0xFFFFFFFF;
        this.camera.clearFlags = cc.Camera.ClearFlags.COLOR;
        this.camera.backgroundColor = cc.color(0, 0, 0, 0);
        // 置为false，手动渲染到纹理，为啥手动：位置问题
        this.camera.enabled = false;

        let spriteShadow = this.node.getComponent(cc.Sprite);
        let spriteFrame = new cc.SpriteFrame();
        spriteFrame.setTexture(this.renderTexture);
        spriteShadow.spriteFrame = spriteFrame;

        if (CC_EDITOR) {
            let cb = () => { this.update(0); };
            this.node.on(cc.Node.EventType.SIZE_CHANGED, cb, this);
            this.node.on(cc.Node.EventType.COLOR_CHANGED, cb, this);
            this.node.on(cc.Node.EventType.ANCHOR_CHANGED, cb, this);
        }
    }

    public start () {

    }

    public update (dt: number) {
        if (!this.nodeTarget) {
            return;
        }
        let posWorld = this.nodeTarget.convertToWorldSpaceAR(this.lookatPos);
        this.nodeCamera.setPosition(this.nodeCamera.parent.convertToNodeSpaceAR(posWorld));
        this.camera.render(this.nodeTarget);
    }
}
