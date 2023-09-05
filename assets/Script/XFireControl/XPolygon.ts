/**
 * 杭州炫火科技有限公司 zwx@xfire.mobi
 * 多边形组件：
 *      1.支持贴图
 *      2.支持贴图移动
 *
 * 注意：
 *      1.贴图必须独立的纹理图片，且宽高必须为2的n次方，如512*256
 *      2.原点对应贴图左下角
 *
 * 使用示例:
 *      挂载到对象，绑定纹理
 *      polygon.clear();
 *      polygon.addPoint(0, 100);
 *      polygon.addPoint(100, 0);
 *      polygon.addPoint(-100, 0);
 *      polygon.endAdd();
 *      polygon.startTexAnimation(cc.v2(-1, -1), 200);
 *
 * 1.0.0
 *      2019年9月19日
 *      demo发布，可构建节点，支持动画，细节待优化
 *
 */
import XMath from '../XModule/XMath';
const FLOAT_PER_VERTEX = 5;

const CC_VERSION_20 = cc.ENGINE_VERSION.indexOf('2.0.') === 0;
const CC_VERSION_21 = cc.ENGINE_VERSION.indexOf('2.1.') === 0;
const CC_VERSION_23 = cc.ENGINE_VERSION.indexOf('2.3.') === 0;

const ccapi = cc as any;
const {ccclass, property, playOnFocus, executeInEditMode, menu} = cc._decorator;

let gfx = null;
if (CC_VERSION_20) {
    gfx = ccapi.renderer.renderEngine.gfx;
}
else if (CC_VERSION_21 || CC_VERSION_23) {
    gfx = ccapi.gfx;
}
console.log(gfx);

@ccclass
@executeInEditMode
@playOnFocus
@menu('XFire/XPolygon')
export default class XPolygon extends cc.RenderComponent {
    @property
    public _mapping: cc.Texture2D = null;
    @property({
        type: cc.Texture2D,
        displayName: CC_DEV && '贴图',
        tooltip: CC_DEV && '多边形贴图'
    })
    public get mapping(): cc.Texture2D {
        return this._mapping;
    }
    public set mapping(value: cc.Texture2D) {
        this._mapping = value;
        this.needUpdate = true;
    }

    @property
    public _texScale = 1;
    @property({
        displayName: CC_DEV && '贴图缩放',
        tooltip: CC_DEV && '多边形贴图缩放'
    })
    public get texScale() {
        return this._texScale;
    }
    public set texScale(value: number) {
        this._texScale = value;
        this.needUpdate = true;
    }

    @property
    public _texOff = cc.v2(0, 0);
    @property({
        displayName: CC_DEV && '贴图偏移',
        tooltip: CC_DEV && '多边形贴图偏移(不受贴图缩放参数影响)，默认原点对应贴图左下角'
    })
    public get texOff() {
        return this._texOff;
    }
    public set texOff(value: cc.Vec2) {
        this._texOff = value;
        this.needUpdate = true;
    }

    @property({
        type: [cc.Vec2],
        displayName: CC_DEV && '坐标数组',
        tooltip: CC_DEV && '多边形顶点，连线不能有交叉'
    })
    public points: cc.Vec2[] = [cc.v2(0, 100), cc.v2(-100, 0), cc.v2(100, 0)];

    private _assembler = {
        useModel: true,
        updateRenderData (comp) {   // comp为组件 此处即XPolygon实例
        },
        renderIA (comp, renderer) {
            // 推送渲染数据
            if (comp.textureLoaded) {
                renderer._flushIA(comp.renderData);
            }
        }
    };

    private _focused: boolean;
    private textureLoaded = false;

    private vertex: Float32Array;
    private uintVertex: Uint32Array;
    private renderData: any;
    private needUpdate = true;
    private texWidth = 100;
    private texHeight = 100;
    private maxVertexCount = 50;

    // 用于确定多边形点序
    private adding = false;
    private isSimplePolygon = false;
    private rightmostPoint = 0;
    private triangles: {p0: cc.Vec2; p1: cc.Vec2; p2: cc.Vec2}[] = [];
    private texAnimateDirection = cc.v2(0, 0);
    private texAnimateSpeed = 0;

    public onLoad () {
        if (CC_EDITOR) {
            let cb = () => { this.needUpdate = true; };
            this.node.on(cc.Node.EventType.SIZE_CHANGED, cb, this);
            this.node.on(cc.Node.EventType.COLOR_CHANGED, cb, this);
            this.node.on(cc.Node.EventType.ANCHOR_CHANGED, cb, this);
        }

        let points = this.points;
        this.clear();
        for (let pt of points) {
            this.addPoint(pt.x, pt.y);
        }
        this.endAdd();

        this.textureLoaded = this._mapping && this._mapping.loaded;
        if (this._mapping) {
            if (this._mapping.loaded) {
                this.createIA();
            }
            else {
                this._mapping.once('load', () => {
                    this.createIA();
                    this.textureLoaded = true;
                });
                (cc as any).textureUtil.postLoadTexture(this._mapping);
            }
        }
    }

    public start() {
    }

    public onEnable() {
        super.onEnable();
        (this.node as any)._renderFlag &= ~ccapi.RenderFlow.FLAG_RENDER;
        (this.node as any)._renderFlag |= ccapi.RenderFlow.FLAG_CUSTOM_IA_RENDER;
    }

    public onFocusInEditor() {
        this._focused = true;
    }

    public onLostFocusInEditor() {
        this._focused = false;
    }

    /**
     * 清理
     */
    public clear() {
        this.points = [];
        this.triangles = [];
        this.rightmostPoint = 0;
        this.isSimplePolygon = false;
        this.needUpdate = true;
    }

    public addPoint(x: number, y: number): boolean {
        let points = this.points;
        if (points.length >= this.maxVertexCount) {
            console.log('不能放入更多点了');
            return false;
        }
        this.needUpdate = true;
        this.adding = true;

        if (points.length < 1) {
            points.push(cc.v2(x, y));
            return true;
        }
        let lastPt = points[points.length - 1];
        if (x === lastPt.x && y === lastPt.y) {
            console.log('与前一点相同');
            return false;
        }
        // 将形成的新线段与已有线段做碰撞检测
        if (points.length >= 2) {
            // 先已有的最后一根线段判断
            {
                let x0 = points[points.length - 2].x;
                let y0 = points[points.length - 2].y;
                let x1 = lastPt.x;
                let y1 = lastPt.y;
                // 线段重合判断
                if ((y - y1) * (x1 - x0) === (y1 - y0) * (x - x1)) {
                    console.log('与最后一跟线段重合');
                    return false;
                }
            }
            // 判断其他线段
            for (let i = 0; i < (points.length - 2); i++) {
                let x0 = points[i].x;
                let y0 = points[i].y;
                let x1 = points[i + 1].x;
                let y1 = points[i + 1].y;
                if (XMath.segmentsIntersect(x0, y0, x1, y1, lastPt.x, lastPt.y, x, y)) {
                    console.log('与线段' + i + '碰撞');
                    return false;
                }
            }
        }

        this.points.push(cc.v2(x, y));
        if (x > this.points[this.rightmostPoint].x) {
            this.rightmostPoint = this.points.length - 1;
        }

        return true;
    }

    public endAdd(): boolean {
        this.needUpdate = true;

        let points = this.points;
        let length = points.length;
        if (length < 3) {
            return false;
        }

        let firstPt = points[0];
        let lastPt = points[length - 1];
        for (let i = 1; i < (length - 2); i++) {
            let x0 = points[i].x;
            let y0 = points[i].y;
            let x1 = points[i + 1].x;
            let y1 = points[i + 1].y;
            if (XMath.segmentsIntersect(x0, y0, x1, y1, lastPt.x, lastPt.y, firstPt.x, firstPt.y)) {
                console.log('与线段' + i + '碰撞');
                return false;
            }
        }
        this.adding = false;
        this.isSimplePolygon = true;
        return true;
    }

    public setTextureOff(x: number, y: number) {
        this.texOff = cc.v2(x, y);
    }

    public startTexAnimation(direction: cc.Vec2, speed: number) {
        this.texAnimateSpeed = speed;
        this.texAnimateDirection = direction.normalize();
        if (this.texAnimateDirection.x === 0 && this.texAnimateDirection.y === 0) {
            this.texAnimateSpeed = 0;
        }
    }

    public stopTexAnimation() {
        this.texAnimateSpeed = 0;
    }

    public update (dt) {
        let justAniNeedUpdate = false;
        if (this.texAnimateSpeed !== 0) {
            this.texOff.addSelf(this.texAnimateDirection.mul(this.texAnimateSpeed * dt));
            justAniNeedUpdate = !this.needUpdate;
            this.needUpdate = true;
        }
        if (this.needUpdate) {
            if (this._mapping != null) {
                let tex = this._mapping as any;
                if ((tex.width & (tex.width - 1)) !== 0 || (tex.height & (tex.height - 1))) {
                    console.error('XPolygon贴图宽高必须为2的n次方');
                }
                if (tex._wrapS === cc.Texture2D.WrapMode.CLAMP_TO_EDGE || tex._wrapT === cc.Texture2D.WrapMode.CLAMP_TO_EDGE) {
                    tex.setWrapMode(cc.Texture2D.WrapMode.REPEAT, cc.Texture2D.WrapMode.REPEAT);
                }
                this.texWidth = tex.width;
                this.texHeight = tex.height;
            }

            if (!justAniNeedUpdate && !this.adding) {
                this.clipToTriangles();
            }

            this.updateVertexData();
            this.needUpdate = false;
        }
    }

    private createIA () {
        if (CC_VERSION_20) {
            this.renderData = new ccapi.renderer.renderEngine.IARenderData();
            this.renderData.material = new ccapi.renderer.renderEngine.SpriteMaterial();
            this.renderData.material.useTexture = true;
            this.renderData.material.useModel = true;
            this.renderData.material.useColor = false;
            this.renderData.material.texture = this.mapping;
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
            this.renderData.material.setProperty('texture', this.mapping);
            // material.setProperty('texture', this.texture);
            this.renderData.ia = new ccapi.renderer.InputAssembler();
            this.renderData.ia._start = 0;
            this.renderData.ia._count = 0;
            // 至少设置一个material 否则modelview无法生效
            (this as any).setMaterial(0, this.renderData.material);
        }

        let device = ccapi.renderer.device;
        // x, y, u, v, color
        let vertexFormat = new gfx.VertexFormat([
            { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
            { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2},
            { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true }
        ]);

        // 5 float for each vertex  x y u v color
        let maxTriangles = this.maxVertexCount - 2;
        this.vertex = new Float32Array(5 * maxTriangles * 3);
        this.uintVertex = new Uint32Array(this.vertex.buffer);
        // let aryIndex = new Uint16Array([0, 1, 2, 1, 3, 2]);
        let aryIndex = new Uint16Array(maxTriangles * 3);   // this.maxVertexCount-2为最多三角形数量
        for (let i = 0; i < aryIndex.length; i++) {
            aryIndex[i] = i;
        }

        this.renderData.ia._vertexBuffer = new gfx.VertexBuffer(
            device,
            vertexFormat,
            gfx.USAGE_DYNAMIC,
            null,   // array buffer with real data
            maxTriangles * 3
        );
        this.renderData.ia._indexBuffer = new gfx.IndexBuffer(device,
            gfx.INDEX_FMT_UINT16,
            gfx.USAGE_STATIC,
            aryIndex,
            aryIndex.length      // index count
        );
    }

    // 将多边形分解为三角形集合
    private clipToTriangles() {
        this.triangles = [];
        let points: cc.Vec2[] = [];
        for (let pt of this.points) {
            points.push(pt);
        }
        let ptCount = points.length;
        if (ptCount < 3) {
            return;
        }
        // 确定为简单多边形（加点时已判断）
        // 确定多边形点序
        let clockwise: boolean;
        {
            let rm = points[this.rightmostPoint];
            let prev = points[(this.rightmostPoint - 1 + ptCount) % ptCount];
            let next = points[(this.rightmostPoint + 1) % ptCount];
            clockwise = XMath.cross(prev.x, prev.y, rm.x, rm.y, next.x, next.y) < 0;
        }
        // 耳切
        let ptLeft = ptCount;
        let curIndex = 0;
        let searchedMonitor = 0;    // 死循环监听
        while (ptLeft >= 3) {
            curIndex = curIndex % ptLeft;
            let cur = points[curIndex];
            let nextIndex = (curIndex + 1) % ptLeft;
            let prevIndex = (curIndex - 1 + ptLeft) % ptLeft;
            let prev = points[prevIndex];
            let next = points[nextIndex];
            let curClockwise = XMath.cross(prev.x, prev.y, cur.x, cur.y, next.x, next.y) < 0;
            if (curClockwise === clockwise) {
                // 判断有没有其他点在耳朵内
                let hasPointInTriangle = false;
                for (let index = (nextIndex + 1 + ptLeft) % ptLeft; index !== prevIndex; index = (index + 1) % ptLeft) {
                    let pt = points[index];
                    if (XMath.isPointInTriangle(pt.x, pt.y, prev.x, prev.y, cur.x, cur.y, next.x, next.y, clockwise)) {
                        hasPointInTriangle = true;
                        break;
                    }
                }
                if (!hasPointInTriangle) {
                    // console.log('切耳：' + cur.x + ' ' + cur.y);
                    this.triangles.push({p0: prev, p1: cur, p2: next});
                    points.splice(curIndex, 1);
                    searchedMonitor = 0;
                    ptLeft--;
                    continue;
                }
            }
            curIndex++;
            searchedMonitor++;
            if (searchedMonitor >= ptLeft) {
                console.log('search wrong');
                break;
            }
        }
    }

    private updateVertexData () {
        if (!this.textureLoaded) {
            return;
        }
        if (this.mapping == null || this.adding || !this.isSimplePolygon) {
            this.renderData.ia._vertexBuffer.update(0, this.vertex);
            this.renderData.ia._count = 0;
            return;
        }
        if (this.triangles.length === 0) {
            return;
        }
        this.renderData.material.texture = this.mapping;
        let clr: cc.Color = this.node.color.clone();
        clr.setA(this.node.opacity);

        let verts = this.vertex;
        let uintV = this.uintVertex;
        let texW = this.texWidth * this.texScale;
        let texH = this.texHeight * this.texScale;

        let offX = (0.5 - this.node.anchorX) * this.node.width;
        let offY = (0.5 - this.node.anchorY) * this.node.height;

        let i = 0;
        for (let triangle of this.triangles) {
            // 三角形点1
            let x = triangle.p0.x;
            let y = triangle.p0.y;
            verts[i++] = x + offX;
            verts[i++] = y + offY;
            verts[i++] = (x - this.texOff.x) / texW;
            verts[i++] = -(y - this.texOff.y) / texH;
            uintV[i++] = (clr as any)._val;

            // 三角形点2
            x = triangle.p1.x;
            y = triangle.p1.y;
            verts[i++] = x + offX;
            verts[i++] = y + offY;
            verts[i++] = (x - this.texOff.x) / texW;
            verts[i++] = -(y - this.texOff.y) / texH;
            uintV[i++] = (clr as any)._val;

            // 三角形点3
            x = triangle.p2.x;
            y = triangle.p2.y;
            verts[i++] = x + offX;
            verts[i++] = y + offY;
            verts[i++] = (x - this.texOff.x) / texW;
            verts[i++] = -(y - this.texOff.y) / texH;
            uintV[i++] = (clr as any)._val;
        }

        this.renderData.ia._vertexBuffer.update(0, this.vertex);
        this.renderData.ia._count = this.triangles.length * 3;
    }

}
