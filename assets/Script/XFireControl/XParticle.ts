/*******************************************************************************
文件: XParticle.ts
创建: 2019年
作者: 老张(zwx@xfire.mobi)
描述:
    炫火自定义粒子组件
*******************************************************************************/

// 动画状态
const STATE_STOP = 0;
const STATE_PLAY = 1;
const STATE_PAUSE = 2;
const STATE_PAUSEEMIT = 3;

// 发射器状态
const EMITTER_STATE_STOP = 0;
const EMITTER_STATE_DELAY = 1;
const EMITTER_STATE_PLAY = 2;

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

@ccclass
@executeInEditMode
@playOnFocus
@menu('XFire/XParticle')
export default class XParticle extends cc.RenderComponent {

    @property
    private _pFile: cc.JsonAsset = null;
    @property({
        type: cc.JsonAsset,
        displayName: CC_DEV && '粒子文件',
        tooltip: CC_DEV && '粒子文件，使用自己的粒子编辑器编辑、导出'
    })
    public get pFile() {
        return this._pFile;
    }
    public set pFile(value) {
        this._pFile = value;
        if (CC_EDITOR) {
            this.loadJson(value);
            if (this.autoPlay) {
                this.play();
            }
            if (this.autoPauseTime > 0) {
                this.autoPlay = true;
            }
        }
    }

    @property({
        type: [cc.SpriteFrame],
        displayName: CC_DEV && '手动指定图片',
        tooltip: CC_DEV && '优先使用手动指定图片，需保证图片名与粒子所用一致'
    })
    private images: cc.SpriteFrame[] = [];

    @property
    private _playbackSpeed = 1;
    @property({
        displayName: CC_DEV && '播放速度',
        tooltip: CC_DEV && '播放速度'
    })
    public get playbackSpeed() {
        return this._playbackSpeed;
    }
    public set playbackSpeed(value: number) {
        this._playbackSpeed = Math.max(0, value);
    }

    @property({
        displayName: CC_DEV && '自动播放',
        tooltip: CC_DEV && '激活后自动播放粒子动画'
    })
    private autoPlay = true;

    @property({
        displayName: CC_DEV && '自动暂停时间',
        tooltip: CC_DEV && '播放指定时间后自动暂停'
    })
    private autoPauseTime = 0;

    private _playOnce = false;
    private playOnceCb: () => void;
    private time = 0;
    private state = STATE_STOP;
    private rFreeze = false;
    private file: any;
    private emitters: Emitter[] = [];
    private lastPos: cc.Vec2;
    private maxCount: number;
    private _focused: boolean;
    private loaded = false;
    private rNeedUpdateVertexData: boolean;

    private _assembler = {
        useModel: true,
        updateRenderData (comp) {   // comp为组件 此处即XParticle实例
        },
        renderIA (comp, renderer) {
            // 推送渲染数据
            for (let emitter of comp.emitters) {
                renderer._flushIA(emitter.renderData);
            }
        }
    };

    public onLoad () {
        this.loadJson(this.pFile);

        if (this.autoPlay) {
            this.play();
        }
        if (this.autoPauseTime > 0) {
            this.autoPlay = true;
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

    public loadJson(file: cc.JsonAsset | string) {
        if (file == null) {
            return;
        }
        if (typeof file === 'string') {
            cc.loader.loadRes(file as string, cc.JsonAsset, (err, jsonAsset) => {
                if (err == null) {
                    console.log(err);
                    return;
                }
                this.loadJson(jsonAsset);
            });
            return;
        }
        this._pFile = file as cc.JsonAsset;

        this.state = STATE_STOP;
        this.file = this._pFile.json;
        this.emitters = [];
        this.lastPos = this.node.convertToWorldSpaceAR(cc.v2(0, 0));

        this.maxCount = 0;
        for (let i = 0; i < this.file.emitters.length; i++) {
            let emitter = this.file.emitters[i];
            let inst = new Emitter();
            inst.init(emitter, this.images);
            this.emitters.push(inst);
            // this.maxCount += emitter.maxCount;
            if (CC_VERSION_21) {
                // 至少设置一个material 否则modelview无法生效
                (this as any).setMaterial(i, inst.renderData.material);
            }
        }
        this.loaded = true;
    }

    public play() {
        this.stop();
        this.time = 0;
        this._playOnce = false;
        this.state = STATE_PLAY;
        this.rFreeze = false;
    }

    public playOnce(cb?: () => void) {
        this.stop();
        this.playOnceCb = cb;
        this._playOnce = true;
        this.state = STATE_PLAY;
        for (let emitter of this.emitters) {
            emitter.newDuration(true, true);
        }
    }

    public stop() {
        this.state = STATE_STOP;
    }

    public freeze() {
        this.rFreeze = true;
    }

    public unfreeze() {
        this.rFreeze = false;
    }

    public enableAutoPause(timeSecond) {
        this.autoPauseTime = timeSecond > 0 ? timeSecond : 0;
    }

    public disableAutoPause() {
        this.autoPauseTime = 0;
    }

    public isAllEmittersStopped() {
        for (let emitter of this.emitters) {
            if (emitter.state !== EMITTER_STATE_STOP) {
                return false;
            }
        }
        return true;
    }

    public getParticleCount() {
        let count = 0;
        for (let emitter of this.emitters) {
            count += emitter.particles.length;
        }
        return count;
    }

    public updateVertexData () {
        for (let emitter of this.emitters) {
            emitter.updateVertexData();
        }
    }

    public update (dt: number) {
        let ldt = dt * this.playbackSpeed;
        if (!this.loaded) {
            return;
        }

        if (CC_EDITOR && !this._focused) {
            this.updateVertexData();
            this.rNeedUpdateVertexData = true;
            return;
        }

        if (CC_EDITOR) {
            for (let emitter of this.emitters) {
                if (emitter.image == null) {
                    emitter.findImageAndGenRenderData(this.images);
                }
            }
        }

        if (this.state === STATE_STOP || this.state === STATE_PAUSE) {
            // 停止 暂停时还是需要更新绘图，因为发射器位置可能变化
            this.rNeedUpdateVertexData = true;
            return;
        }
        if (this.autoPauseTime > 0 && (this.time + ldt) > this.autoPauseTime) {
            this.state = STATE_PAUSE;
            this.rNeedUpdateVertexData = true;
            return;
        }
        this.time += ldt;
        let allEmittersStopped = true;
        for (let emitter of this.emitters) {
            emitter.update(ldt);
        }

        if (this.state === STATE_PLAY && this.isAllEmittersStopped() && this.getParticleCount() === 0) {
            if (this._playOnce) {
                this.stop();
                if (this.playOnceCb) {
                    this.playOnceCb();
                }
            }
            else {
                for (let emitter of this.emitters) {
                    emitter.newDuration(false, true);
                }
            }
        }

        this.rNeedUpdateVertexData = true;
    }

    public lateUpdate() {
        if (!this.loaded) {
            return;
        }
        // 为什么放到这里 因为如果放到update中判断位置，很可能位置偏移修正后，底层又修改node的位置，从而渲染时出现位置偏差
        // 如果后续还有偏差 可以放到renderIA中取
        let curPos = this.node.convertToWorldSpaceAR(cc.v2(0, 0));
        let posOff = curPos.sub(this.lastPos);
        this.lastPos.set(curPos);
        for (let emitter of this.emitters) {
            emitter.move(posOff);
        }

        // 生成顶点数据
        if (this.rNeedUpdateVertexData) {
            this.updateVertexData();
            this.rNeedUpdateVertexData = false;
        }
    }

    // update (dt) {}
}

class RangeNumber{
    public value: number;
    private src: any;
    private scale: number;
    public constructor(json, scale) {
        this.src = json;
        this.scale = scale || 1;
        this.value = 0;
        this.getValue();
    }

    public newValue() {
        if (!this.src.active) {
            return this.value;
        }
        let off = this.src.lowMax - this.src.lowMin;
        this.value = this.src.lowMin + off * Math.random();
        this.value *= this.scale;
        return this.value;
    }

    public getValue() {
        return this.value;
    }
}

class ScaleNumber{
    public value: number;
    public active: boolean;
    private src: any;
    private base: number;
    private diff: number;
    private random: boolean;

    public constructor(json) {
        this.src = json;
        this.active = this.src && this.src.active !== false;
        this.random = this.src && this.src.random === true;
        this.value = 0;
        this.newBaseDiff();
        this.update(0);
    }

    public newBaseDiff() {
        if (!this.active) {
            return;
        }
        let src = this.src;
        let low = src.lowMin + (src.lowMax - src.lowMin) * Math.random();
        let high = src.highMin + (src.highMax - src.highMin) * Math.random();
        this.base = low;
        if (src.relative) {
            this.diff = high;
        }
        else {
            this.diff = high - low;
        }
    }

    public update(percent: number) {
        if (!this.active) {
            return this.value;
        }
        let timeline = this.src.timeline;
        let scaling = this.src.scaling;
        let count = timeline.length;
        if (count <= 0) {
            this.value = this.base + this.diff;
            return this.value;
        }
        else if (count === 1) {
            this.value = this.base + this.diff * scaling[0];
            return this.value;
        }
        let time1 = timeline[0];
        for (let i = 0; i < (count - 1); i++) {
            let time2 = timeline[i + 1];
            if (percent >= time1 && percent <= time2) {
                if ((time2 - time1) < 0.0001) {
                    this.value = scaling[i];
                }
                else {
                    this.value = (percent - time1) * (scaling[i + 1] - scaling[i]) / (time2 - time1) + scaling[i];
                }
                this.value = this.base + this.diff * this.value;
                return this.value;
            }
            time1 = time2;
        }
        this.value = this.base + this.diff * scaling[count - 1];
        return this.value;
    }

    public getValue() {
        if (this.random) {
            return this.base + (this.value - this.base) * Math.random();
        }
        return this.value;
    }
}

class GradientColor{
    private src: any;
    private value: number[];
    private rgb: number[];

    public constructor(json) {
        this.src = json;
        this.src.active = this.src.active !== false;
        this.value = [255, 255, 255];
        this.newBaseDiff();
        this.update(0);
    }

    public newBaseDiff() {
        if (!this.src.active) {
            return;
        }
        let src = this.src;
        this.rgb = [];
        let rgb = this.src.rgb;
        let vrgb = this.src.vrgb;
        for (let i = 0; i < rgb.length; i++) {
            let v = rgb[i];
            let vv = vrgb[i];
            v += vv * (Math.random() - 0.5) * 2;
            v *= 255;
            if (v < 0) {
                v = 0;
            }
            if (v > 255) {
                v = 255;
            }
            this.rgb.push(v);
        }
    }

    public update(percent: number) {
        if (!this.src.active) {
            return this.value;
        }
        let timeline = this.src.timeline;
        let scaling = this.src.scaling;
        let count = timeline.length;
        let rgb = this.rgb;
        if (count <= 0) {
            return this.value;
        }
        else if (count === 1) {
            this.value = [rgb[0], rgb[1], rgb[2]];
            return this.value;
        }
        let time1 = timeline[0];
        for (let i = 0; i < (count - 1); i++) {
            let time2 = timeline[i + 1];
            if (percent >= time1 && percent <= time2) {
                if ((time2 - time1) < 0.0001) {
                    this.value = [rgb[3 * i], rgb[3 * i + 1], rgb[3 * i + 2]];
                }
                else {
                    let j = i + 1;
                    let rDiff = rgb[3 * j] - rgb[3 * i];
                    let gDiff = rgb[3 * j + 1] - rgb[3 * i + 1];
                    let bDiff = rgb[3 * j + 2] - rgb[3 * i + 2];
                    let p = (percent - time1) / (time2 - time1);
                    this.value = [rgb[3 * i] + rDiff * p, rgb[3 * i + 1] + gDiff * p, rgb[3 * i + 2] + bDiff * p];
                }
                return this.value;
            }
            time1 = time2;
        }
        this.value = [rgb[count * 3 - 3], rgb[count * 3 - 2], rgb[count * 3 - 1]];
        return this.value;
    }

    public getValue() {
        return this.value;
    }
}

class Particle{
    public x: number;
    public y: number;
    public time: number;
    public life: number;
    public image: any;
    private src: any;
    private lifeOffset: number;
    private width: ScaleNumber;
    private height: ScaleNumber;
    private velocity: ScaleNumber;
    private rotation: ScaleNumber;
    private direction: ScaleNumber;
    private color: GradientColor;
    private alpha: ScaleNumber;
    private angle: number;
    private wind: ScaleNumber;
    private gravity: ScaleNumber;

    public constructor(emitter) {
        this.src = emitter;
        this.lifeOffset = 0;
        this.width = new ScaleNumber(emitter.width || emitter.size);
        this.height = new ScaleNumber(emitter.height);
        this.velocity = new ScaleNumber(emitter.velocity);
        this.rotation = new ScaleNumber(emitter.rotation);
        this.direction = new ScaleNumber(emitter.direction);
        this.color = new GradientColor(emitter.color);
        this.alpha = new ScaleNumber(emitter.alpha);
        this.wind = new ScaleNumber(emitter.wind);
        this.gravity = new ScaleNumber(emitter.gravity);
    }

    public newDuration(life, image, x, y, direction) {
        this.time = 0;
        this.x = x || 0;
        this.y = y || 0;
        this.angle = 0;
        this.life = life;
        this.image = image;
        this.width.newBaseDiff();
        this.height.newBaseDiff();
        this.velocity.newBaseDiff();
        this.rotation.newBaseDiff();
        this.direction.newBaseDiff();
        if (direction) {
            this.direction.value = direction;
        }
        this.color.newBaseDiff();
        this.alpha.newBaseDiff();
        this.wind.newBaseDiff();
        this.gravity.newBaseDiff();
    }

    public update(dt: number) {
        this.time += dt;
        let percent = this.time / this.life;
        if (percent < 0) {
            percent = 0;
        }
        if (percent > 1) {
            percent = 1;
        }

        this.width.update(percent);
        this.height.update(percent);
        this.velocity.update(percent);
        this.rotation.update(percent);
        this.direction.update(percent);
        this.color.update(percent);
        this.alpha.update(percent);
        this.wind.update(percent);
        this.gravity.update(percent);

        let dir = this.direction.getValue() * Math.PI / 180;
        let movedDist = this.velocity.getValue() * dt;
        this.x += Math.cos(dir) * movedDist + this.wind.getValue() * dt;
        this.y += Math.sin(dir) * movedDist + this.gravity.getValue() * dt;
        this.angle = this.rotation.getValue();
        if (this.src.options.aligned) {
            this.angle += this.direction.getValue();
        }
    }

    public genVertex(vertex, uintVertex, offset) {
        let alpha = this.alpha.getValue() * 255;
        let width_2 = this.width.getValue() / 2;
        let height_2: number;
        if (this.height.active) {
            height_2 = this.height.getValue() / 2;
        }
        else {
            if (!this.image) {
                height_2 = width_2;
            }
            else {
                height_2 = (this.image.getRect().height / this.image.getRect().width) * width_2;
            }
        }
        let x = this.x;
        let y = this.y;
        if (this.angle !== 0) {
            let x1 = - width_2;
            let y1 = - height_2;
            let x2 = width_2;
            let y2 = height_2;
            let rad = this.angle * Math.PI / 180;
            let cr = Math.cos(rad);
            let sr = Math.sin(rad);
            // bl
            vertex[offset] = x1 * cr - y1 * sr + x;
            vertex[offset + 1] = x1 * sr + y1 * cr + y;
            // br
            vertex[offset + 5] = x2 * cr - y1 * sr + x;
            vertex[offset + 6] = x2 * sr + y1 * cr + y;
            // tl
            vertex[offset + 10] = x1 * cr - y2 * sr + x;
            vertex[offset + 11] = x1 * sr + y2 * cr + y;
            // tr
            vertex[offset + 15] = x2 * cr - y2 * sr + x;
            vertex[offset + 16] = x2 * sr + y2 * cr + y;
        }
        else {
            // 左下
            vertex[offset] = x - width_2;
            vertex[offset + 1] = y - height_2;
            // 右下
            vertex[offset + 5] = x + width_2;
            vertex[offset + 6] = y - height_2;
            // 左上
            vertex[offset + 10] = x - width_2;
            vertex[offset + 11] = y + height_2;
            // 右上
            vertex[offset + 15] = x + width_2;
            vertex[offset + 16] = y + height_2;
        }

        {
            let rgb = this.color.getValue();
            let color = new cc.Color(rgb[0], rgb[1], rgb[2], alpha);
            uintVertex[offset + 4] = (color as any)._val;
            uintVertex[offset + 9] = (color as any)._val;
            uintVertex[offset + 14] = (color as any)._val;
            uintVertex[offset + 19] = (color as any)._val;
        }
    }
}

class Emitter{
    public state: number;
    public particles: Particle[];
    public renderData: any;
    public image: cc.SpriteFrame;
    public imageLoaded = false;
    private time: number;
    private src: any;
    private minCount: number;
    private maxCount: number;
    private pool: Particle[];
    private lastEmitLeft: number;
    private playOnce: boolean;
    private emitted: number;
    private visibleCount: number;
    private additive: boolean;
    private attached: boolean;
    private continuous: boolean;
    private delay: RangeNumber;
    private duration: RangeNumber;
    private emission: ScaleNumber;
    private life: ScaleNumber;
    private lifeOffset: ScaleNumber;
    private xOffset: ScaleNumber;
    private yOffset: ScaleNumber;
    private spawnWidth: ScaleNumber;
    private spawnHeight: ScaleNumber;
    private vertex: Float32Array;
    private uintVertex: Uint32Array;

    public constructor() {
        this.time = 0;

        if (CC_VERSION_20) {
            this.renderData = new ccapi.renderer.renderEngine.IARenderData();
            this.renderData.material = new ccapi.renderer.renderEngine.SpriteMaterial();
            this.renderData.material.useTexture = true;
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
            // material.setProperty('texture', this.texture);
            this.renderData.ia = new ccapi.renderer.InputAssembler();
            this.renderData.ia._start = 0;
            this.renderData.ia._count = 0;
        }
    }

    public init(emitter, spriteFrames) {
        this.src = emitter;
        this.state = EMITTER_STATE_STOP;

        this.minCount = emitter.count.min;
        this.maxCount = emitter.count.max;
        if (this.maxCount < this.minCount) {
            this.maxCount = this.minCount;
        }
        this.particles = [];
        this.pool = [];
        for (let i = 0; i < 256; i++) {
            let particle = new Particle(emitter);
            this.pool.push(particle);
        }

        this.lastEmitLeft = 0;

        this.playOnce = false;
        this.emitted = 0;
        this.visibleCount = 0;
        this.additive = emitter.options.additive;
        this.attached = emitter.options.attached;
        this.continuous = emitter.options.continuous;

        this.delay = new RangeNumber(emitter.delay, 0.001);
        this.duration = new RangeNumber(emitter.duration, 0.001);
        this.emission = new ScaleNumber(emitter.emission);
        this.life = new ScaleNumber(emitter.life);
        this.lifeOffset = new ScaleNumber(emitter.lifeOffset);
        this.xOffset = new ScaleNumber(emitter.xOffset);
        this.yOffset = new ScaleNumber(emitter.yOffset);
        this.spawnWidth = new ScaleNumber(emitter.spawnWidth);
        this.spawnHeight = new ScaleNumber(emitter.spawnHeight);
        if (this.src.spawnShape.shape === 'point') {
            this.spawnWidth.active = false;
            this.spawnHeight.active = false;
        }

        this.findImageAndGenRenderData(spriteFrames);

        this.newDuration(false, true);
    }

    public findImageAndGenRenderData(spriteFrames) {
        let imagePath = this.src.images && this.src.images[0];
        imagePath = imagePath || this.src.image;
        {
            imagePath = imagePath.replace('\\', '/');
            imagePath = imagePath.substr(imagePath.lastIndexOf('/') + 1);
            imagePath = imagePath.substr(0, imagePath.lastIndexOf('.'));
            for (let frame of spriteFrames) {
                if (frame == null) {
                    continue;
                }
                if (frame.name === imagePath) {
                    this.image = frame;
                    break;
                }
            }
        }
        this.imageLoaded = this.image && this.image.textureLoaded();
        if (this.image) {
            if (this.imageLoaded) {
                this.genRenderData();
            }
            else {
                this.image.once('load', () => {
                    this.genRenderData();
                    this.imageLoaded = true;
                });
                // 开始加载纹理
                this.image.ensureLoadTexture();
            }
        }

    }

    public newDuration(playOnce: boolean, newPlay: boolean) {
        this.time = 0;
        if (newPlay) {
            this.emitted = 0;
        }
        this.playOnce = playOnce === true;
        if (!this.continuous) {
            this.lastEmitLeft = 0;
        }
        this.delay.newValue();
        this.duration.newValue();
        this.emission.newBaseDiff();
        this.life.newBaseDiff();
        this.lifeOffset.newBaseDiff();
        this.xOffset.newBaseDiff();
        this.yOffset.newBaseDiff();
        this.spawnWidth.newBaseDiff();
        this.spawnHeight.newBaseDiff();
        if (this.delay.getValue() > 0) {
            this.state = EMITTER_STATE_DELAY;
        }
        else {
            this.state = EMITTER_STATE_PLAY;
        }
    }

    public emit(count: number) {
        let particles = this.particles;
        let lCount = count || 1;
        lCount = Math.min(lCount, this.maxCount - particles.length);
        if (lCount <= 0) {
            return;
        }
        for (let i = 0; i < lCount && particles.length < this.maxCount; i++) {
            let particle = this.pool.pop() || new Particle(this.src);
            let offx = 0;
            let offy = 0;
            let direction = 0;
            let spawnShape = this.src.spawnShape;
            switch (spawnShape.shape){
                case 'point':
                    break;
                case 'line':
                    let rnd = Math.random();
                    // 求线上点
                    offx = this.spawnWidth.getValue() * rnd;
                    offy = this.spawnHeight.getValue() * rnd;
                    break;
                case 'ellipse':
                    let radiusX = this.spawnWidth.getValue() / 2;
                    let radiusY = this.spawnHeight.getValue() / 2;
                    if (radiusX === 0 || radiusY === 0) {
                        break;
                    }
                    let scaleY = radiusX / radiusY;
                    if (spawnShape.edges) {
                        let spawnAngle;
                        if (spawnShape.side === 'both') {
                            spawnAngle = 360 * Math.random();
                        }
                        else if (spawnShape.side === 'top') {
                            spawnAngle = 180 * Math.random();
                        }
                        else {
                            spawnAngle = -180 * Math.random();
                        }

                        offx = radiusX * Math.cos(spawnAngle * Math.PI / 180);
                        offy = radiusY * Math.sin(spawnAngle * Math.PI / 180);
                        direction = spawnAngle;
                    }
                    else {
                        // 此处的算法原理是 椭圆为圆的压扁 先在圆内取点 再压缩纵向
                        let radius2 = radiusX * radiusX;
                        while (true) {
                            let x = radiusX * 2 * Math.random() - radiusX;
                            let y = radiusX * 2 * Math.random() - radiusX;
                            if ((x * x + y * y) <= radius2) {
                                offx = x;
                                offy = y / scaleY;
                                break;
                            }
                        }
                    }
                    break;
                case 'square':
                    offx = this.spawnWidth.getValue() * (Math.random() - 0.5);
                    offy = this.spawnHeight.getValue() * (Math.random() - 0.5);
                    break;
            }

            particle.newDuration(this.life.getValue() / 1000, this.image, this.xOffset.getValue() + offx, this.yOffset.getValue() + offy, direction);
            this.particles.push(particle);
            this.emitted++;
        }
    }

    // 发射器位置变了 已有粒子需要处理
    public move(posOff: cc.Vec2) {
        if (this.attached) {
            return;
        }
        let particles = this.particles;
        if (posOff.x !== 0 || posOff.y !== 0) {
            for (let particle of particles) {
                particle.x -= posOff.x;
                particle.y -= posOff.y;
            }
        }
    }

    public update(dt) {
        let particles = this.particles;
        this.time += dt;
        if (this.state === EMITTER_STATE_DELAY) {
            if (this.time >= this.delay.getValue()) {
                this.state = EMITTER_STATE_PLAY;
            }
        }

        if (this.time >= (this.delay.value + this.duration.value)) {
            if (this.continuous && !this.playOnce) {
                let timeBk = this.time;
                timeBk -= (this.delay.value + this.duration.value);
                this.newDuration(false, false);
                this.time = timeBk;
                if (timeBk >= this.delay.value) {
                    this.state = EMITTER_STATE_PLAY;
                }
                else {
                    this.state = EMITTER_STATE_DELAY;
                }
            }
            else {
                this.state = EMITTER_STATE_STOP;
            }
        }

        // 发射器周期百分比
        let percent = (this.time - this.delay.value) / this.duration.value;
        if (percent < 0) {
            percent = 0;
        }
        if (percent > 1) {
            percent = 1;
        }
        // 更新发射器属性
        this.emission.update(percent);
        this.life.update(percent);
        this.lifeOffset.update(percent);
        this.xOffset.update(percent);
        this.yOffset.update(percent);
        this.spawnWidth.update(percent);
        this.spawnHeight.update(percent);

        // 发射新的粒子
        if (this.state === EMITTER_STATE_PLAY && particles.length < this.maxCount) {
            let count = this.lastEmitLeft + this.emission.getValue() * dt;
            let countFloor = Math.floor(count);
            if (countFloor === 0 && this.emitted === 0) {
                countFloor = 1;
            }
            this.lastEmitLeft = count - countFloor;
            if (countFloor > 0) {
                this.emit(countFloor);
            }
        }
        // 已有粒子更新
        let index = 0;
        while (index < particles.length) {
            let particle = particles[index];
            particle.update(dt);
            if (particle.time > particle.life) {
                particles[index] = particles[particles.length - 1];
                this.pool.push(particle);
                particles.length--;
            }
            else {
                index++;
            }
        }

        // 补刀
        if (this.state === EMITTER_STATE_PLAY && this.particles.length < this.minCount) {
            this.emit(this.minCount - this.particles.length);
        }
    }

    public updateVertexData() {
        if (!this.imageLoaded) {
            return;
        }
        let count = 0;
        let offset = 0;
        let vertex = this.vertex;
        for (let particle of this.particles) {
            particle.genVertex(vertex, this.uintVertex, offset);
            offset += FLOAT_PER_VERTEX * 4;
            count++;
        }
        this.renderData.ia._vertexBuffer.update(0, vertex);
        this.renderData.ia._count = 6 * count;   // 6是一个粒子需要两个三角形，对应的6个定点
    }

    private genRenderData() {
        let device = ccapi.renderer.device;
        let uv = this.image && (this.image as any).uv;
        this.imageLoaded = this.image && this.image.textureLoaded();
        if (uv != null) {
            if (CC_VERSION_20) {
                this.renderData.material.texture = this.image.getTexture();
            }
            else if (CC_VERSION_21) {
                this.renderData.material.define('_USE_MODEL', true);
                this.renderData.material.setProperty('texture', this.image.getTexture());
            }
            else {
                console.error('XParticle: 不支持的版本');
            }
        }
        // 混合模式
        {
            let pass = null;
            if (CC_VERSION_20) {
                pass = this.renderData.material._mainTech.passes[0];
                if (this.additive) {
                    pass.setBlend(gfx.BLEND_FUNC_ADD, cc.macro.SRC_ALPHA, cc.macro.ONE, gfx.BLEND_FUNC_ADD, cc.macro.SRC_ALPHA, cc.macro.ONE);
                }
                else {
                    pass.setBlend(gfx.BLEND_FUNC_ADD, cc.macro.SRC_ALPHA, cc.macro.ONE_MINUS_SRC_ALPHA, gfx.BLEND_FUNC_ADD, cc.macro.SRC_ALPHA, cc.macro.ONE_MINUS_SRC_ALPHA);
                }
            }
            else if (CC_VERSION_21) {
                pass = this.renderData.material.effect.getDefaultTechnique().passes[0];
                if (this.additive) {
                    pass.setBlend(true, gfx.BLEND_FUNC_ADD, cc.macro.SRC_ALPHA, cc.macro.ONE, gfx.BLEND_FUNC_ADD, cc.macro.SRC_ALPHA, cc.macro.ONE);
                }
                else {
                    pass.setBlend(true, gfx.BLEND_FUNC_ADD, cc.macro.SRC_ALPHA, cc.macro.ONE_MINUS_SRC_ALPHA, gfx.BLEND_FUNC_ADD, cc.macro.SRC_ALPHA, cc.macro.ONE_MINUS_SRC_ALPHA);
                }
            }
        }
        // x, y, u, v, color
        let vertexFormat = new gfx.VertexFormat([
            { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
            { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2},
            { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true }
        ]);

        // 5 float for each vertex  x y u v color
        this.vertex = new Float32Array(FLOAT_PER_VERTEX * 4 * this.maxCount);
        this.uintVertex = new Uint32Array(this.vertex.buffer);
        let aryIndex = new Uint16Array(6 * this.maxCount);
        for (let i = 0; i < this.maxCount; i++) {
            aryIndex[i * 6] = i * 4;
            aryIndex[i * 6 + 1] = i * 4 + 1;
            aryIndex[i * 6 + 2] = i * 4 + 2;
            aryIndex[i * 6 + 3] = i * 4 + 1;
            aryIndex[i * 6 + 4] = i * 4 + 3;
            aryIndex[i * 6 + 5] = i * 4 + 2;
            this.uintVertex[i * FLOAT_PER_VERTEX * 4 + 4] = (cc.Color.WHITE as any)._val;
            this.uintVertex[i * FLOAT_PER_VERTEX * 4 + 9] = (cc.Color.WHITE as any)._val;
            this.uintVertex[i * FLOAT_PER_VERTEX * 4 + 14] = (cc.Color.WHITE as any)._val;
            this.uintVertex[i * FLOAT_PER_VERTEX * 4 + 19] = (cc.Color.WHITE as any)._val;
            if (uv) {
                this.vertex[i * FLOAT_PER_VERTEX * 4 + 2] = uv[0];
                this.vertex[i * FLOAT_PER_VERTEX * 4 + 3] = uv[1];
                this.vertex[i * FLOAT_PER_VERTEX * 4 + 7] = uv[2];
                this.vertex[i * FLOAT_PER_VERTEX * 4 + 8] = uv[3];
                this.vertex[i * FLOAT_PER_VERTEX * 4 + 12] = uv[4];
                this.vertex[i * FLOAT_PER_VERTEX * 4 + 13] = uv[5];
                this.vertex[i * FLOAT_PER_VERTEX * 4 + 17] = uv[6];
                this.vertex[i * FLOAT_PER_VERTEX * 4 + 18] = uv[7];
            }
        }

        this.renderData.ia._vertexBuffer = new gfx.VertexBuffer(
            device,
            vertexFormat,
            gfx.USAGE_DYNAMIC,
            null,   // array buffer with real data
            4 * this.maxCount       // vertex count
        );
        this.renderData.ia._indexBuffer = new gfx.IndexBuffer(device,
            gfx.INDEX_FMT_UINT16,
            gfx.USAGE_STATIC,
            aryIndex,
            aryIndex.length      // index count
        );
    }
}
