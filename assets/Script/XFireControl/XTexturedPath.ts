/*******************************************************************************
文件: XTexturedPath.ts
创建: 2020年08月19日
作者: 老张(zwx@xfire.mobi)
描述:
    带纹理路径
*******************************************************************************/

import XMath from '../XModule/XMath';
const DEBUG = true;
const IGNORE_ERROR = 1e-7;

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
@menu('XFire/XTexturedPath')
export default class XTexturedPath extends cc.RenderComponent {
    @property
    public _mapping: cc.SpriteFrame = null;
    @property({
        type: cc.SpriteFrame,
        displayName: CC_DEV && '贴图',
        tooltip: CC_DEV && '路径贴图'
    })
    public get mapping(): cc.SpriteFrame {
        return this._mapping;
    }
    public set mapping(value: cc.SpriteFrame) {
        this._mapping = value;
        this.updateTexture();
    }

    @property({
        type: [cc.Vec2],
        displayName: CC_DEV && '坐标数组',
        tooltip: CC_DEV && '路径点'
    })
    public points: cc.Vec2[] = [cc.v2(0, 0), cc.v2(100, 0), cc.v2(100, -100)];

    @property
    public _lineWidth = 10;
    @property({
        displayName: CC_DEV && '线宽',
        tooltip: CC_DEV && '线宽',
        visible: CC_DEV && function() {
            return this != null;
        }
    })
    public get lineWidth() {
        return this._lineWidth;
    }
    public set lineWidth(value: number) {
        this._lineWidth = value;
        this.needUpdate = true;
    }

    @property
    public _roundRadius = 5;
    @property({
        displayName: CC_DEV && '最大内径',
        tooltip: CC_DEV && '最大内径，实际可能被调低',
        visible: CC_DEV && function() {
            return this != null;
        }
    })
    public get roundRadius() {
        return this._roundRadius;
    }
    public set roundRadius(value: number) {
        this._roundRadius = value;
        this.needUpdate = true;
    }

    @property
    public _precision = 5;
    @property({
        displayName: CC_DEV && '折弯分割角度',
        tooltip: CC_DEV && '折弯处分割精度，单位：角度',
        visible: CC_DEV && function() {
            return this != null;
        }
    })
    public get precision() {
        return this._precision;
    }
    public set precision(value: number) {
        this._precision = value;
    }

    private _assembler = {
        useModel: true,
        updateRenderData (comp) {   // comp为组件 此处即XPolygon实例
        },
        renderIA (comp, renderer) {
            // 推送渲染数据
            if (comp.imageLoaded) {
                renderer._flushIA(comp.renderData);
            }
        }
    };

    private _focused: boolean;
    private imageLoaded = false;

    private vertex: Float32Array;
    private uintVertex: Uint32Array;
    private renderData: any;
    private needUpdate = true;
    /** 最大点数 */
    private maxVertexCount = 50;

    private validVertsCount = 0;

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
            this.addPoint(pt);
        }
        this.updateTexture();
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
        this.needUpdate = true;
    }

    /**
     * 添加点
     */
    public addPoint(point: cc.Vec2): boolean {
        let points = this.points;
        if (points.length >= this.maxVertexCount) {
            console.error('不能放入更多点了');
            return false;
        }
        this.needUpdate = true;
        points.push(cc.v2(point.x, point.y));
        return true;
    }

    public movePoint(index: number, pos: cc.Vec2) {
        let pt = this.points[index];
        if (pt == null) {
            console.error('index非法：' + index);
            return;
        }
        pt.set(pos);
        this.needUpdate = true;
    }

    public update(dt: number) {
        if (CC_EDITOR) {
            let thiz = this as any;
            if (thiz._lastPoints == null) {
                thiz._lastPoints = '';
            }
            let strPoints = JSON.stringify(this.points);
            if (thiz._lastPoints !== strPoints) {
                this.needUpdate = true;
                thiz._lastPoints = strPoints;
            }
        }
        // 延后加载的图片
        if (!this.imageLoaded && this.mapping && this.mapping.textureLoaded()) {
            setTimeout(() => {
                this.updateTexture();
            }, 0);
        }
        if (this.needUpdate) {
            this.generateVertices();
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
            // this.renderData.material.define('USE_TEXTURE', false);
            this.renderData.material.setProperty('texture', this.mapping.getTexture());
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
        let maxTriangles = 4 + (this.maxVertexCount - 1) * Math.ceil(180 / this.precision);
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

    // 将有宽路径分解并生成点集合
// tslint:disable-next-line: cyclomatic-complexity
    private generateVertices() {
        if (this._mapping == null || this.renderData == null) {
            return;
        }
        let points: cc.Vec2[] = [];
        for (let pt of this.points) {
            points.push(pt);
        }
        let ptCount = points.length;
        if (ptCount < 2) {
            return;
        }
        let halfLineWidth = Math.abs(this.lineWidth) / 2;
        ////////////////////////////////////////////////////////////////////////
        // 素材准备：向量、单位向量、点法向、夹角弧度、折弯内径、折弯圆心坐标、折弯方向
        ////////////////////////////////////////////////////////////////////////
        let vectors: cc.Vec2[] = [];        // 计算向量组，当前点到下一点，总数为点数-1
        let radii: number[] = [];           // 折弯内径，总数为点数-1
        let bendLeft: boolean[] = [];       // 标记点是否左弯曲
        let centers: cc.Vec2[] = [];        // 折弯处圆心坐标，总数为点数-1
        let uVectors: cc.Vec2[] = [];       // 单位向量组，总数为点数-1
        let angles: number[] = [Math.PI];   // 点的夹角弧度，首尾设定为180度
        let nVectors: cc.Vec2[] = [];       // 点的单位法向量，取左侧，对于折弯点，位于角中分线上，同夹角合拢方向
        // 向量、单位向量
        for (let index = 0; index < (ptCount - 1); index++) {
            let v = points[index + 1].sub(points[index]);
            vectors.push(v);
            uVectors.push(v.normalize());
        }
        // 法向、夹角弧度、折弯内径、折弯圆心
        {
            // 首点法向垂直p0p1
            nVectors[0] = cc.v2(-uVectors[0].y, uVectors[0].x);
            let lastVector = uVectors[0].neg();
            for (let index = 1; index < (ptCount - 1); index++) {
                let curVector = uVectors[index];
                // 计算法向，看看是否可以换成由角度过来更优
                let nv = lastVector.add(curVector);
                if (Math.abs(nv.x) <= IGNORE_ERROR && Math.abs(nv.y) <= IGNORE_ERROR) {
                    nv.x = -curVector.y;
                    nv.y = curVector.x;
                    bendLeft.push(true);
                }
                else {
                    // 基于外积判断是否左弯
                    bendLeft.push(curVector.cross(lastVector) >= 0);
                }
                nv.normalizeSelf();
                nVectors[index] = nv;

                // 基于内积计算折弯弧度
                let cos = lastVector.dot(curVector);
                if (cos > 1) cos = 1;
                if (cos < -1) cos = -1;
                let angle = Math.acos(cos);
                angles.push(angle);
                // 折弯内径限值，确保不会占用前后向量一半的长度（首尾段允许全部）
                let lastLen = vectors[index - 1].mag() / 2;
                if (index === 1) {
                    lastLen *= 2;
                }
                let curLen = vectors[index].mag() / 2;
                if (index === vectors.length - 1) {
                    curLen *= 2;
                }
                let lastMaxRadius = lastLen * Math.tan(angle / 2) - halfLineWidth;
                let curMaxRadius = curLen * Math.tan(angle / 2) - halfLineWidth;
                let maxRadius = Math.min(lastMaxRadius, curMaxRadius);
                // 如果内径小于等于0时不折弯会出现扭曲现象
                // 异常点集：线宽50，最大内径5，折弯角度5，(0, 0) (35, -19) (33, -35) 内径小于0
                // 正常点集：线宽50，最大内径5，折弯角度5，(0, 0) (35, -19) (34, -35)
                // 当前注释掉，使内径为负依然添加  [2020年10月15日 老张]
                /*if (maxRadius <= 0) {
                    radii.push(0);
                    centers.push(points[index]);
                }
                else*/{
                    let radius = Math.min(this.roundRadius, maxRadius);
                    radii.push(radius);
                    // 计算出折弯圆心点坐标
                    let len = (radius + halfLineWidth) / Math.sin(angle / 2);
                    let center = points[index].add(nVectors[index].mul(len));
                    centers.push(center);
                }

                lastVector = curVector.neg();
            }
        }
        // 尾点法向
        {
            let lastNeg = uVectors[uVectors.length - 1].neg();
            nVectors[nVectors.length] = cc.v2(lastNeg.y, -lastNeg.x).normalize();
        }
        // 尾点夹角
        angles.push(Math.PI);
        if (DEBUG) {
            console.log('向量', vectors);
            console.log('单位向量', uVectors);
            console.log('法向量', nVectors);
            console.log('夹角弧度', angles);
            console.log('折弯圆心', centers);
            console.log('左弯标记', bendLeft);
        }
        ////////////////////////////////////////////////////////////////////////
        // 生成路径的两侧线上的点，点数一致
        ////////////////////////////////////////////////////////////////////////
        let precision = Math.abs(this.precision) * Math.PI / 180;
        let leftPoints: cc.Vec2[] = [];
        let rightPoints: cc.Vec2[] = [];
        // 首点
        leftPoints.push(cc.v2(points[0].add(nVectors[0].mul(halfLineWidth))));
        rightPoints.push(cc.v2(points[0].add(nVectors[0].mul(-halfLineWidth))));
        // 折弯点处理
        for (let index = 1; index < (ptCount - 1); index++) {
            let bendToLeft = bendLeft[index - 1];
            // 取点夹角
            let angle = angles[index];
            // 如果夹角与PI差值低于设定精度则不做圆角处理
            if (angle > (Math.PI - precision)) {
                leftPoints.push(cc.v2(points[index].add(nVectors[index].mul(bendToLeft ? halfLineWidth : -halfLineWidth))));
                rightPoints.push(cc.v2(points[index].add(nVectors[index].mul(bendToLeft ? -halfLineWidth : halfLineWidth))));
                continue;
            }
            // 折弯圆心
            let center = centers[index - 1];
            // 方向、长度
            let inLen = radii[index - 1];           // 内径
            let outLen = inLen + halfLineWidth * 2; // 外径
            let nv = nVectors[index].neg();
            // 旋转到起始位置
            let rotateAngle = Math.PI  - angle;
            nv.rotateSelf(bendToLeft ? -rotateAngle / 2 : rotateAngle / 2);
            // 开始生成点
            for (let curAngle = 0; curAngle < rotateAngle; curAngle += precision) {
                leftPoints.push(nv.rotate(bendToLeft ? curAngle : -curAngle).mulSelf(bendToLeft ? inLen : outLen).addSelf(center));
                rightPoints.push(nv.rotate(bendToLeft ? curAngle : -curAngle).mulSelf(bendToLeft ? outLen : inLen).addSelf(center));
            }
            leftPoints.push(nv.rotate(bendToLeft ? rotateAngle : -rotateAngle).mulSelf(bendToLeft ? inLen : outLen).addSelf(center));
            rightPoints.push(nv.rotate(bendToLeft ? rotateAngle : -rotateAngle).mulSelf(bendToLeft ? outLen : inLen).addSelf(center));
        }
        // 尾点
        leftPoints.push(cc.v2(points[ptCount - 1].add(nVectors[ptCount - 1].mul(halfLineWidth))));
        rightPoints.push(cc.v2(points[ptCount - 1].add(nVectors[ptCount - 1].mul(-halfLineWidth))));
        if (DEBUG) {
            console.log('左侧点', leftPoints);
            console.log('右侧点', rightPoints);
        }
        ////////////////////////////////////////////////////////////////////////
        // 生成点间距及总长用于uv计算
        ////////////////////////////////////////////////////////////////////////
        let leftDistances: number[] = [0];
        let leftLen = 0;
        let rightDistances: number[] = [0];
        let rightLen = 0;

        for (let index = 1; index < leftPoints.length; index++) {
            let leftDist = leftPoints[index].sub(leftPoints[index - 1]).mag();
            let rightDist = rightPoints[index].sub(rightPoints[index - 1]).mag();
            leftLen += leftDist;
            rightLen += rightDist;
            leftDistances.push(leftLen);
            rightDistances.push(rightLen);
        }
        if (DEBUG) {
            console.log('左侧距离', leftDistances, leftLen);
            console.log('右侧距离', rightDistances, rightLen);
        }

        ////////////////////////////////////////////////////////////////////////
        // 将两侧线上的点拆分成三角形 并生成顶点数据
        ////////////////////////////////////////////////////////////////////////
        let verts = this.vertex;
        let uintV = this.uintVertex;
        let clr: cc.Color = this.node.color.clone();
        clr.setA(this.node.opacity);
        let offX = (0.5 - this.node.anchorX) * this.node.width;
        let offY = (0.5 - this.node.anchorY) * this.node.height;
        let i = 0;
        this.validVertsCount = 0;
        // uv数据：左下 右下 左上 右上 8个数
        let uv: number[] = this.mapping && (this.mapping as any).uv;
        let uvLeft = uv[0];
        let uvRight = uv[2];
        let uvTop = uv[5];
        let uvBottom = uv[1];
        let uvHeight = uvBottom - uvTop;
        for (let index = 1; index < leftPoints.length; index++) {
            // 左下点（假设线从下向上延申，下同）
            let lb = leftPoints[index - 1];
            // 右上
            let rt = rightPoints[index];
            // 左上
            let lt = leftPoints[index];
            // 右下
            let rb = rightPoints[index - 1];

            // 三角形1：左下-右下-左上
            verts[i++] = lb.x + offX;
            verts[i++] = lb.y + offY;
            verts[i++] = uvLeft;
            verts[i++] = uvBottom - leftDistances[index - 1] * uvHeight / leftLen;
            uintV[i++] = (clr as any)._val;

            verts[i++] = rb.x + offX;
            verts[i++] = rb.y + offY;
            verts[i++] = uvRight;
            verts[i++] = uvBottom - rightDistances[index - 1] * uvHeight / rightLen;
            uintV[i++] = (clr as any)._val;

            verts[i++] = lt.x + offX;
            verts[i++] = lt.y + offY;
            verts[i++] = uvLeft;
            verts[i++] = uvBottom - leftDistances[index] * uvHeight / leftLen;
            uintV[i++] = (clr as any)._val;
            // 三角形1：右下-右上-左上
            verts[i++] = rb.x + offX;
            verts[i++] = rb.y + offY;
            verts[i++] = uvRight;
            verts[i++] = uvBottom - rightDistances[index - 1] * uvHeight / rightLen;
            uintV[i++] = (clr as any)._val;

            verts[i++] = rt.x + offX;
            verts[i++] = rt.y + offY;
            verts[i++] = uvRight;
            verts[i++] = uvBottom - rightDistances[index] * uvHeight / rightLen;
            uintV[i++] = (clr as any)._val;

            verts[i++] = lt.x + offX;
            verts[i++] = lt.y + offY;
            verts[i++] = uvLeft;
            verts[i++] = uvBottom - leftDistances[index] * uvHeight / leftLen;
            uintV[i++] = (clr as any)._val;

            this.validVertsCount += 6;
        }
    }

    private updateVertexData () {
        if (!this.imageLoaded) {
            return;
        }
        if (this.mapping == null && this.renderData) {
            this.renderData.ia._vertexBuffer.update(0, this.vertex);
            this.renderData.ia._count = 0;
            return;
        }

        this.renderData.material.texture = this.mapping.getTexture();
        this.renderData.ia._vertexBuffer.update(0, this.vertex);
        this.renderData.ia._count = this.validVertsCount;
    }

    private updateTexture() {
        this.needUpdate = true;
        this.imageLoaded = this._mapping != null && this._mapping.textureLoaded();
        if (this._mapping && this.renderData == null) {
            if (this._mapping.textureLoaded()) {
                this.createIA();
            }
        }
        if (this.renderData != null) {
            this.renderData.material.setProperty('texture', this.mapping.getTexture());
        }
        this.needUpdate = true;
    }

}
