/**
 * 炫火矩形组件
 *
 */
const FLOAT_PER_VERTEX = 5;

const CC_VERSION_20 = cc.ENGINE_VERSION.indexOf('2.0.') === 0;
const CC_VERSION_21 = cc.ENGINE_VERSION.indexOf('2.1.') === 0;

const ccapi = cc as any;
const {ccclass, property, playOnFocus, executeInEditMode, menu} = cc._decorator;

let gfx = null;
if (CC_VERSION_20) {
    gfx = ccapi.renderer.renderEngine.gfx;
}
else if (CC_VERSION_21) {
    gfx = ccapi.gfx;
}

@ccclass
@executeInEditMode
@playOnFocus
@menu('XFire/XRectangle')
export default class XRectangle extends cc.RenderComponent {
    private static _assembler = {
        useModel: true,
        updateRenderData (comp: XRectangle) {
            // if (!comp.renderData) {
            //    comp.renderData = new cc.IARenderData();
            // }
        },
        renderIA (comp, renderer) {
            // 推送渲染数据
            renderer._flushIA(comp.renderData);
        }
    };

    @property
    public _multiColor = false;
    @property({
        displayName: CC_DEV && '多色',
        tooltip: CC_DEV && '激活可以为矩形4个角分别指定颜色'
    })
    public get multiColor() {
        return this._multiColor;
    }
    public set multiColor(value: boolean) {
        this._multiColor = value;
        this.needUpdate = true;
    }

    @property()
    public _clrLeftBottom: cc.Color = cc.Color.WHITE;
    @property({
        displayName: CC_DEV && '左下',
        tooltip: CC_DEV && '指定左下角颜色',
        visible: CC_DEV && function() {
            return this.multiColor;
        }
    })
    public get clrLeftBottom(): cc.Color {
        return this._clrLeftBottom;
    }
    public set clrLeftBottom(value: cc.Color) {
        this._clrLeftBottom.set(value);
    }

    @property()
    public _clrLeftTop: cc.Color = cc.Color.WHITE;
    @property({
        displayName: CC_DEV && '左上',
        tooltip: CC_DEV && '指定左上角颜色',
        visible: CC_DEV && function() {
            return this.multiColor;
        }
    })
    public get clrLeftTop(): cc.Color {
        return this._clrLeftTop;
    }
    public set clrLeftTop(value: cc.Color) {
        this._clrLeftTop.set(value);
    }

    @property()
    public _clrRightTop: cc.Color = cc.Color.WHITE;
    @property({
        displayName: CC_DEV && '右上',
        tooltip: CC_DEV && '指定右上角颜色',
        visible: CC_DEV && function() {
            return this.multiColor;
        }
    })
    public get clrRightTop(): cc.Color {
        return this._clrRightTop;
    }
    public set clrRightTop(value: cc.Color) {
        this._clrRightTop.set(value);
    }

    @property()
    public _clrRightBottom: cc.Color = cc.Color.WHITE;
    @property({
        displayName: CC_DEV && '右下',
        tooltip: CC_DEV && '指定右下角颜色',
        visible: CC_DEV && function() {
            return this.multiColor;
        }
    })
    public get clrRightBottom(): cc.Color {
        return this._clrRightBottom;
    }
    public set clrRightBottom(value: cc.Color) {
        this._clrRightBottom.set(value);
    }

    private vertex: Float32Array;
    private uintVertex: Uint32Array;
    private renderData: any;
    private needUpdate = true;

    public onLoad () {
        /*ccapi.Class.Attr.setClassAttr(XRectangle, 'clrLeftTop', function () {
            return !this.singleColor;
        });*/
        if (CC_EDITOR) {
            let cb = () => { this.needUpdate = true; };
            this.node.on(cc.Node.EventType.SIZE_CHANGED, cb, this);
            this.node.on(cc.Node.EventType.COLOR_CHANGED, cb, this);
            this.node.on(cc.Node.EventType.ANCHOR_CHANGED, cb, this);
        }

        this.createIA();
    }

    public start() {
    }

    public onEnable() {
        super.onEnable();
        (this.node as any)._renderFlag &= ~ccapi.RenderFlow.FLAG_RENDER;
        (this.node as any)._renderFlag |= ccapi.RenderFlow.FLAG_CUSTOM_IA_RENDER;
        // (this.node as any)._renderFlag |= ccapi.RenderFlow.FLAG_RENDER;
    }

    public update (dt) {
        if (this.needUpdate) {
            this.updateVertexData();
        }
    }

    private createIA () {
        if (CC_VERSION_20) {
            this.renderData = new ccapi.renderer.renderEngine.IARenderData();
            this.renderData.material = new ccapi.renderer.renderEngine.SpriteMaterial();
            this.renderData.material.useTexture = false;
            this.renderData.material.useModel = true;
            this.renderData.material.useColor = false;
            this.renderData.ia = new ccapi.renderer.renderEngine.InputAssembler();
            this.renderData.ia._start = 0;
            this.renderData.ia._count = 0;
        }
        else if (CC_VERSION_21) {
            this.renderData = new ccapi.IARenderData();
            this.renderData.material = ccapi.Material.getInstantiatedBuiltinMaterial('2d-sprite', this);
            // renderData.material = new cc.Material();
            // renderData.material.useTexture = true;
            // this.renderData.material.useModel = true;
            // this.renderData.material.useColor = false;
            this.renderData.material.define('_USE_MODEL', true);
            this.renderData.material.define('USE_TEXTURE', false);
            this.renderData.ia = new ccapi.renderer.InputAssembler();
            this.renderData.ia._start = 0;
            this.renderData.ia._count = 0;
            // console.log(this.renderData.material.getHash());
            // 至少设置一个material 否则modelview无法生效
            (this as any).setMaterial(0, this.renderData.material);
        }

        let device = ccapi.renderer.device;
        // Vertex format defines vertex buffer layout: x, y, color
        let vertexFormat = new gfx.VertexFormat([
            { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
            { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true }
        ]);

        // 3 float for each vertex
        this.vertex = new Float32Array(3 * 4);
        this.uintVertex = new Uint32Array(this.vertex.buffer);
        let aryIndex = new Uint16Array([0, 1, 2, 1, 3, 2]);

        this.renderData.ia._vertexBuffer = new gfx.VertexBuffer(
            device,
            vertexFormat,
            gfx.USAGE_DYNAMIC,
            null,   // array buffer with real data
            4
        );
        this.renderData.ia._indexBuffer = new gfx.IndexBuffer(device,
            gfx.INDEX_FMT_UINT16,
            gfx.USAGE_STATIC,
            aryIndex,
            aryIndex.length      // index count
        );
    }

    private updateVertexData () {
        let clrNode = this.node.color;
        clrNode.setA(this.node.opacity);
        let lb: cc.Color = this.multiColor ? this.clrLeftBottom : clrNode;
        let lt: cc.Color = this.multiColor ? this.clrLeftTop : clrNode;
        let rt: cc.Color = this.multiColor ? this.clrRightTop : clrNode;
        let rb: cc.Color = this.multiColor ? this.clrRightBottom : clrNode;

        let verts = this.vertex;
        let uintV = this.uintVertex;
        let w2 = this.node.width / 2;
        let h2 = this.node.height / 2;

        let offX = (0.5 - this.node.anchorX) * this.node.width;
        let offY = (0.5 - this.node.anchorY) * this.node.height;

        let i = 0;
        // bl
        verts[i++] = -w2 + offX;
        verts[i++] = -h2 + offY;
        // color._val is rgba packed into uint32
        uintV[i++] = (lb as any)._val;
        // br
        verts[i++] = w2 + offX;
        verts[i++] = -h2 + offY;
        uintV[i++] = (rb as any)._val;
        // tl
        verts[i++] = -w2 + offX;
        verts[i++] = h2 + offY;
        uintV[i++] = (lt as any)._val;
        // tr
        verts[i++] = w2 + offX;
        verts[i++] = h2 + offY;
        uintV[i++] = (rt as any)._val;

        this.renderData.ia._vertexBuffer.update(0, this.vertex);
        this.renderData.ia._count = 6;   // 6是一个粒子需要两个三角形，对应的6个定点
    }

}
