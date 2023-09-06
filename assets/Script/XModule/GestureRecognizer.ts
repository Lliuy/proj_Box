
// 点
type Point = [number, number];

function distance(pt1: Point, pt2: Point) {
    let dx = pt2[0] - pt1[0];
    let dy = pt2[1] - pt1[1];
    return Math.sqrt(dx * dx + dy * dy);
}

// 矩形
class Rectangle {
    public x: number;
    public y: number;
    public width: number;
    public height: number;

    public constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

// 线
class Line {
    public points: Point[] = [];

    public constructor(points: Point[]) {
        this.points = points;
    }

    // 计算一根多线段线的长度
    public length(): number {
        let d = 0;
        let points = this.points;
        for (let i = 1; i < points.length; i++) {
            d += distance(points[i], points[i - 1]);
        }
        return d;
    }

    // 节数
    public segCount() {
        return this.points.length - 1;
    }

    // 指定节的长度
    public segLength(segIndex: number): number {
        return distance(this.points[segIndex], this.points[segIndex + 1]);
    }

    // 取点，指定节上指定距离
    public pickPoint(segIndex: number, length: number): Point {
        let segLen = this.segLength(segIndex);
        let pt1 = this.points[segIndex];
        let pt2 = this.points[segIndex + 1];
        let x = pt1[0] + (pt2[0] - pt1[0]) * length / segLen;
        let y = pt1[1] + (pt2[1] - pt1[1]) * length / segLen;
        return [x, y];
    }

    // 计算两条线平均点距，两条线段点数相同
    public distance(dst: Line)
    {
        let d = 0;
        for (let i = 0; i < this.points.length; i++) {
            d += distance(this.points[i], dst.points[i]);
        }
        return d / this.points.length;
    }

    // 计算线段的包围盒
    public boundingBox(): Rectangle
    {
        let minX = +Infinity;
        let maxX = -Infinity;
        let minY = +Infinity;
        let maxY = -Infinity;
        for (let point of this.points) {
            minX = Math.min(minX, point[0]);
            minY = Math.min(minY, point[1]);
            maxX = Math.max(maxX, point[0]);
            maxY = Math.max(maxY, point[1]);
        }
        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }

    // 线段所有点平均坐标，当作重心
    public centroid(): Point
    {
        let x = 0;
        let y = 0;
        for (let point of this.points) {
            x += point[0];
            y += point[1];
        }
        x /= this.points.length;
        y /= this.points.length;
        return [x, y];
    }

    // 将线段绕"重心"旋转一定弧度
    public rotateBy(radians: number)
    {
        let c = this.centroid();
        let cos = Math.cos(radians);
        let sin = Math.sin(radians);
        let newpoints: Point[] = [];
        for (let point of this.points) {
            let qx = (point[0] - c[0]) * cos - (point[1] - c[1]) * sin + c[0];
            let qy = (point[0] - c[0]) * sin + (point[1] - c[1]) * cos + c[0];
            newpoints[newpoints.length] = [qx, qy];
        }
        return newpoints;
    }

    // 缩放线段使包围盒缩放到指定大小 当前算法同时缩放宽高，这对于宽高比例悬殊的图形会导致误差，如一条横线被放大成正方形
    public scaleTo(size: number) // non-uniform scale; assumes 2D gestures (i.e., no lines)
    {
        let bbox = this.boundingBox();
        let newpoints: Point[] = [];
        for (let point of this.points) {
            let qx = point[0] * (size / bbox.width);
            let qy = point[1] * (size / bbox.height);
            newpoints[newpoints.length] = [qx, qy];
        }
        return newpoints;
    }

    // 将线的"重心"移动到指定点
    public translateTo(pt: Point) // translates points' centroid
    {
        let c = this.centroid();
        let newpoints: Point[] = [];
        for (let point of this.points) {
            let qx = point[0] + pt[0] - c[0];
            let qy = point[1] + pt[1] - c[1];
            newpoints[newpoints.length] = [qx, qy];
        }
        return newpoints;
    }

    // 将所有向量正常化，使总长度为1
    public vectorize() // for Protractor
    {
        let sum = 0;
        let vectors: Point[] = [];
        for (let point of this.points) {
            vectors.push([point[0], point[1]]);
            sum += point[0] * point[0] + point[1] * point[1];
        }
        let magnitude = Math.sqrt(sum);
        for (let vector of vectors) {
            vector[0] = vector[0] / magnitude;
            vector[1] = vector[1] / magnitude;
        }
        return vectors;
    }
}

// 结果
class Result {
    public name: string;
    public score: number;
    public time: number;

    public constructor(name: string, score: number, ms: number) {
        this.name = name;
        this.score = score;
        this.time = ms;
    }
}

// 参数
const NumUnistrokes = 16;
const NumPoints = 64;
const SquareSize = 250;
const Origin: Point = [0, 0];
const Diagonal = Math.sqrt(SquareSize * SquareSize + SquareSize * SquareSize);
const HalfDiagonal = 0.5 * Diagonal;
const AngleRange = 45 * Math.PI / 180;
const AnglePrecision = 2 * Math.PI / 180;
const Phi = 0.5 * (-1 + Math.sqrt(5)); // Golden Ratio

// 单笔手势
class Gesture {
    // 手势名称
    public name: string;
    // 手势轨迹线
    public line: Line;

    public vector: Point[];

    public constructor(name: string, points: Point[]) {
        this.name = name;
        this.line = new Line(points);
        this.resample(NumPoints);
        let radian = this.indicativeAngle();
        this.line.rotateBy(-radian);
        this.line.scaleTo(SquareSize);
        this.line.translateTo(Origin);
        this.vector = this.line.vectorize();
    }

    // 对线进行重新取样分割到指定的点数
    private resample(dstPointCount: number)
    {
        // 重新取样后线的每节平均长度
        let intervalLength = this.line.length() / (dstPointCount - 1); // interval length
        let newpoints: Point[] = [];
        newpoints.push(this.line.points[0]);

        let curSeg = 0;
        let preSegsLeftLen = 0; // 前面segs剩余长度
        let curSegLen = 0;
        let curSegUsedLen = 0;
        for (let i = 0; i < dstPointCount - 1; i++) {
            let left = preSegsLeftLen + curSegLen - curSegUsedLen;
            if (left < intervalLength) {
                preSegsLeftLen += (curSegLen - curSegUsedLen);
                curSegLen = this.line.segLength(curSeg++);
                curSegUsedLen = 0;
                continue;
            }
            let pt = this.line.pickPoint(curSeg, curSegUsedLen + (intervalLength - preSegsLeftLen));
            newpoints.push(pt);
            curSegUsedLen += intervalLength - preSegsLeftLen;
            preSegsLeftLen = 0;
        }

        newpoints.push(this.line.points.pop());
        this.line.points = newpoints;
    }

    // 线的重心->起点 弧度
    private indicativeAngle(): number
    {
        let c = this.line.centroid();
        return Math.atan2(c[1] - this.line.points[0][1], c[0] - this.line.points[0][0]);
    }
}

export default class GestureRecognizer {
    public unistrokes: Gesture[] = [];

    public constructor() {
        this.unistrokes.push(new Gesture('triangle', [[137, 139], [135, 141], [133, 144], [132, 146], [130, 149], [128, 151], [126, 155], [123, 160], [120, 166], [116, 171], [112, 177], [107, 183], [102, 188], [100, 191], [95, 195], [90, 199], [86, 203], [82, 206], [80, 209], [75, 213], [73, 213], [70, 216], [67, 219], [64, 221], [61, 223], [60, 225], [62, 226], [65, 225], [67, 226], [74, 226], [77, 227], [85, 229], [91, 230], [99, 231], [108, 232], [116, 233], [125, 233], [134, 234], [145, 233], [153, 232], [160, 233], [170, 234], [177, 235], [179, 236], [186, 237], [193, 238], [198, 239], [200, 237], [202, 239], [204, 238], [206, 234], [205, 230], [202, 222], [197, 216], [192, 207], [186, 198], [179, 189], [174, 183], [170, 178], [164, 171], [161, 168], [154, 160], [148, 155], [143, 150], [138, 148], [136, 148]]));
        this.unistrokes.push(new Gesture('x', [[87, 142], [89, 145], [91, 148], [93, 151], [96, 155], [98, 157], [100, 160], [102, 162], [106, 167], [108, 169], [110, 171], [115, 177], [119, 183], [123, 189], [127, 193], [129, 196], [133, 200], [137, 206], [140, 209], [143, 212], [146, 215], [151, 220], [153, 222], [155, 223], [157, 225], [158, 223], [157, 218], [155, 211], [154, 208], [152, 200], [150, 189], [148, 179], [147, 170], [147, 158], [147, 148], [147, 141], [147, 136], [144, 135], [142, 137], [140, 139], [135, 145], [131, 152], [124, 163], [116, 177], [108, 191], [100, 206], [94, 217], [91, 222], [89, 225], [87, 226], [87, 224]]));
        this.unistrokes.push(new Gesture('rectangle', [[78, 149], [78, 153], [78, 157], [78, 160], [79, 162], [79, 164], [79, 167], [79, 169], [79, 173], [79, 178], [79, 183], [80, 189], [80, 193], [80, 198], [80, 202], [81, 208], [81, 210], [81, 216], [82, 222], [82, 224], [82, 227], [83, 229], [83, 231], [85, 230], [88, 232], [90, 233], [92, 232], [94, 233], [99, 232], [102, 233], [106, 233], [109, 234], [117, 235], [123, 236], [126, 236], [135, 237], [142, 238], [145, 238], [152, 238], [154, 239], [165, 238], [174, 237], [179, 236], [186, 235], [191, 235], [195, 233], [197, 233], [200, 233], [201, 235], [201, 233], [199, 231], [198, 226], [198, 220], [196, 207], [195, 195], [195, 181], [195, 173], [195, 163], [194, 155], [192, 145], [192, 143], [192, 138], [191, 135], [191, 133], [191, 130], [190, 128], [188, 129], [186, 129], [181, 132], [173, 131], [162, 131], [151, 132], [149, 132], [138, 132], [136, 132], [122, 131], [120, 131], [109, 130], [107, 130], [90, 132], [81, 133], [76, 133]]));
        this.unistrokes.push(new Gesture('circle', [[127, 141], [124, 140], [120, 139], [118, 139], [116, 139], [111, 140], [109, 141], [104, 144], [100, 147], [96, 152], [93, 157], [90, 163], [87, 169], [85, 175], [83, 181], [82, 190], [82, 195], [83, 200], [84, 205], [88, 213], [91, 216], [96, 219], [103, 222], [108, 224], [111, 224], [120, 224], [133, 223], [142, 222], [152, 218], [160, 214], [167, 210], [173, 204], [178, 198], [179, 196], [182, 188], [182, 177], [178, 167], [170, 150], [163, 138], [152, 130], [143, 129], [140, 131], [129, 136], [126, 139]]));
        this.unistrokes.push(new Gesture('check', [[91, 185], [93, 185], [95, 185], [97, 185], [100, 188], [102, 189], [104, 190], [106, 193], [108, 195], [110, 198], [112, 201], [114, 204], [115, 207], [117, 210], [118, 212], [120, 214], [121, 217], [122, 219], [123, 222], [124, 224], [126, 226], [127, 229], [129, 231], [130, 233], [129, 231], [129, 228], [129, 226], [129, 224], [129, 221], [129, 218], [129, 212], [129, 208], [130, 198], [132, 189], [134, 182], [137, 173], [143, 164], [147, 157], [151, 151], [155, 144], [161, 137], [165, 131], [171, 122], [174, 118], [176, 114], [177, 112], [177, 114], [175, 116], [173, 118]]));
        this.unistrokes.push(new Gesture('caret', [[79, 245], [79, 242], [79, 239], [80, 237], [80, 234], [81, 232], [82, 230], [84, 224], [86, 220], [86, 218], [87, 216], [88, 213], [90, 207], [91, 202], [92, 200], [93, 194], [94, 192], [96, 189], [97, 186], [100, 179], [102, 173], [105, 165], [107, 160], [109, 158], [112, 151], [115, 144], [117, 139], [119, 136], [119, 134], [120, 132], [121, 129], [122, 127], [124, 125], [126, 124], [129, 125], [131, 127], [132, 130], [136, 139], [141, 154], [145, 166], [151, 182], [156, 193], [157, 196], [161, 209], [162, 211], [167, 223], [169, 229], [170, 231], [173, 237], [176, 242], [177, 244], [179, 250], [181, 255], [182, 257]]));
        this.unistrokes.push(new Gesture('zig-zag', [[307, 216], [333, 186], [356, 215], [375, 186], [399, 216], [418, 186]]));
        this.unistrokes.push(new Gesture('arrow', [[68, 222], [70, 220], [73, 218], [75, 217], [77, 215], [80, 213], [82, 212], [84, 210], [87, 209], [89, 208], [92, 206], [95, 204], [101, 201], [106, 198], [112, 194], [118, 191], [124, 187], [127, 186], [132, 183], [138, 181], [141, 180], [146, 178], [154, 173], [159, 171], [161, 170], [166, 167], [168, 167], [171, 166], [174, 164], [177, 162], [180, 160], [182, 158], [183, 156], [181, 154], [178, 153], [171, 153], [164, 153], [160, 153], [150, 154], [147, 155], [141, 157], [137, 158], [135, 158], [137, 158], [140, 157], [143, 156], [151, 154], [160, 152], [170, 149], [179, 147], [185, 145], [192, 144], [196, 144], [198, 144], [200, 144], [201, 147], [199, 149], [194, 157], [191, 160], [186, 167], [180, 176], [177, 179], [171, 187], [169, 189], [165, 194], [164, 196]]));
        this.unistrokes.push(new Gesture('left square bracket', [[140, 124], [138, 123], [135, 122], [133, 123], [130, 123], [128, 124], [125, 125], [122, 124], [120, 124], [118, 124], [116, 125], [113, 125], [111, 125], [108, 124], [106, 125], [104, 125], [102, 124], [100, 123], [98, 123], [95, 124], [93, 123], [90, 124], [88, 124], [85, 125], [83, 126], [81, 127], [81, 129], [82, 131], [82, 134], [83, 138], [84, 141], [84, 144], [85, 148], [85, 151], [86, 156], [86, 160], [86, 164], [86, 168], [87, 171], [87, 175], [87, 179], [87, 182], [87, 186], [88, 188], [88, 195], [88, 198], [88, 201], [88, 207], [89, 211], [89, 213], [89, 217], [89, 222], [88, 225], [88, 229], [88, 231], [88, 233], [88, 235], [89, 237], [89, 240], [89, 242], [91, 241], [94, 241], [96, 240], [98, 239], [105, 240], [109, 240], [113, 239], [116, 240], [121, 239], [130, 240], [136, 237], [139, 237], [144, 238], [151, 237], [157, 236], [159, 237]]));
        this.unistrokes.push(new Gesture('right square bracket', [[112, 138], [112, 136], [115, 136], [118, 137], [120, 136], [123, 136], [125, 136], [128, 136], [131, 136], [134, 135], [137, 135], [140, 134], [143, 133], [145, 132], [147, 132], [149, 132], [152, 132], [153, 134], [154, 137], [155, 141], [156, 144], [157, 152], [158, 161], [160, 170], [162, 182], [164, 192], [166, 200], [167, 209], [168, 214], [168, 216], [169, 221], [169, 223], [169, 228], [169, 231], [166, 233], [164, 234], [161, 235], [155, 236], [147, 235], [140, 233], [131, 233], [124, 233], [117, 235], [114, 238], [112, 238]]));
        this.unistrokes.push(new Gesture('v', [[89, 164], [90, 162], [92, 162], [94, 164], [95, 166], [96, 169], [97, 171], [99, 175], [101, 178], [103, 182], [106, 189], [108, 194], [111, 199], [114, 204], [117, 209], [119, 214], [122, 218], [124, 222], [126, 225], [128, 228], [130, 229], [133, 233], [134, 236], [136, 239], [138, 240], [139, 242], [140, 244], [142, 242], [142, 240], [142, 237], [143, 235], [143, 233], [145, 229], [146, 226], [148, 217], [149, 208], [149, 205], [151, 196], [151, 193], [153, 182], [155, 172], [157, 165], [159, 160], [162, 155], [164, 150], [165, 148], [166, 146]]));
        this.unistrokes.push(new Gesture('delete', [[123, 129], [123, 131], [124, 133], [125, 136], [127, 140], [129, 142], [133, 148], [137, 154], [143, 158], [145, 161], [148, 164], [153, 170], [158, 176], [160, 178], [164, 183], [168, 188], [171, 191], [175, 196], [178, 200], [180, 202], [181, 205], [184, 208], [186, 210], [187, 213], [188, 215], [186, 212], [183, 211], [177, 208], [169, 206], [162, 205], [154, 207], [145, 209], [137, 210], [129, 214], [122, 217], [118, 218], [111, 221], [109, 222], [110, 219], [112, 217], [118, 209], [120, 207], [128, 196], [135, 187], [138, 183], [148, 167], [157, 153], [163, 145], [165, 142], [172, 133], [177, 127], [179, 127], [180, 125]]));
        this.unistrokes.push(new Gesture('left curly brace', [[150, 116], [147, 117], [145, 116], [142, 116], [139, 117], [136, 117], [133, 118], [129, 121], [126, 122], [123, 123], [120, 125], [118, 127], [115, 128], [113, 129], [112, 131], [113, 134], [115, 134], [117, 135], [120, 135], [123, 137], [126, 138], [129, 140], [135, 143], [137, 144], [139, 147], [141, 149], [140, 152], [139, 155], [134, 159], [131, 161], [124, 166], [121, 166], [117, 166], [114, 167], [112, 166], [114, 164], [116, 163], [118, 163], [120, 162], [122, 163], [125, 164], [127, 165], [129, 166], [130, 168], [129, 171], [127, 175], [125, 179], [123, 184], [121, 190], [120, 194], [119, 199], [120, 202], [123, 207], [127, 211], [133, 215], [142, 219], [148, 220], [151, 221]]));
        this.unistrokes.push(new Gesture('right curly brace', [[117, 132], [115, 132], [115, 129], [117, 129], [119, 128], [122, 127], [125, 127], [127, 127], [130, 127], [133, 129], [136, 129], [138, 130], [140, 131], [143, 134], [144, 136], [145, 139], [145, 142], [145, 145], [145, 147], [145, 149], [144, 152], [142, 157], [141, 160], [139, 163], [137, 166], [135, 167], [133, 169], [131, 172], [128, 173], [126, 176], [125, 178], [125, 180], [125, 182], [126, 184], [128, 187], [130, 187], [132, 188], [135, 189], [140, 189], [145, 189], [150, 187], [155, 186], [157, 185], [159, 184], [156, 185], [154, 185], [149, 185], [145, 187], [141, 188], [136, 191], [134, 191], [131, 192], [129, 193], [129, 195], [129, 197], [131, 200], [133, 202], [136, 206], [139, 211], [142, 215], [145, 220], [147, 225], [148, 231], [147, 239], [144, 244], [139, 248], [134, 250], [126, 253], [119, 253], [115, 253]]));
        this.unistrokes.push(new Gesture('star', [[75, 250], [75, 247], [77, 244], [78, 242], [79, 239], [80, 237], [82, 234], [82, 232], [84, 229], [85, 225], [87, 222], [88, 219], [89, 216], [91, 212], [92, 208], [94, 204], [95, 201], [96, 196], [97, 194], [98, 191], [100, 185], [102, 178], [104, 173], [104, 171], [105, 164], [106, 158], [107, 156], [107, 152], [108, 145], [109, 141], [110, 139], [112, 133], [113, 131], [116, 127], [117, 125], [119, 122], [121, 121], [123, 120], [125, 122], [125, 125], [127, 130], [128, 133], [131, 143], [136, 153], [140, 163], [144, 172], [145, 175], [151, 189], [156, 201], [161, 213], [166, 225], [169, 233], [171, 236], [174, 243], [177, 247], [178, 249], [179, 251], [180, 253], [180, 255], [179, 257], [177, 257], [174, 255], [169, 250], [164, 247], [160, 245], [149, 238], [138, 230], [127, 221], [124, 220], [112, 212], [110, 210], [96, 201], [84, 195], [74, 190], [64, 182], [55, 175], [51, 172], [49, 170], [51, 169], [56, 169], [66, 169], [78, 168], [92, 166], [107, 164], [123, 161], [140, 162], [156, 162], [171, 160], [173, 160], [186, 160], [195, 160], [198, 161], [203, 163], [208, 163], [206, 164], [200, 167], [187, 172], [174, 179], [172, 181], [153, 192], [137, 201], [123, 211], [112, 220], [99, 229], [90, 237], [80, 244], [73, 250], [69, 254], [69, 252]]));
        this.unistrokes.push(new Gesture('pigtail', [[81, 219], [84, 218], [86, 220], [88, 220], [90, 220], [92, 219], [95, 220], [97, 219], [99, 220], [102, 218], [105, 217], [107, 216], [110, 216], [113, 214], [116, 212], [118, 210], [121, 208], [124, 205], [126, 202], [129, 199], [132, 196], [136, 191], [139, 187], [142, 182], [144, 179], [146, 174], [148, 170], [149, 168], [151, 162], [152, 160], [152, 157], [152, 155], [152, 151], [152, 149], [152, 146], [149, 142], [148, 139], [145, 137], [141, 135], [139, 135], [134, 136], [130, 140], [128, 142], [126, 145], [122, 150], [119, 158], [117, 163], [115, 170], [114, 175], [117, 184], [120, 190], [125, 199], [129, 203], [133, 208], [138, 213], [145, 215], [155, 218], [164, 219], [166, 219], [177, 219], [182, 218], [192, 216], [196, 213], [199, 212], [201, 211]]));
    }

    // The $1 Gesture Recognizer API begins here -- 3 methods: Recognize(), AddGesture(), and DeleteUserGestures()
    public recognize(points: Point[], useProtractor: boolean): Result {
        let t0 = Date.now();
        let candidate = new Gesture('', points);

        let u = -1;
        let b = +Infinity;
        for (let i = 0; i < this.unistrokes.length; i++) // for each unistroke template
        {
            let d;
            if (useProtractor) {
                d = optimalCosineDistance(this.unistrokes[i].vector, candidate.vector); // Protractor
            }
            else {
                d = distanceAtBestAngle(candidate.line.points, this.unistrokes[i], -AngleRange, +AngleRange, AnglePrecision); // Golden Section Search (original $1)
            }
            if (d < b) {
                b = d; // best (least) distance
                u = i; // unistroke index
            }
        }
        let t1 = Date.now();
        return (u === -1) ? new Result('No match.', 0, t1 - t0) : new Result(this.unistrokes[u].name, useProtractor ? (1 - b) : (1 - b / HalfDiagonal), t1 - t0);
    }

    public addGesture(name: string, points: Point[]) {
        this.unistrokes[this.unistrokes.length] = new Gesture(name, points); // append new unistroke
        let num = 0;
        for (let unistroke of this.unistrokes) {
            if (unistroke.name === name) {
                num++;
            }
        }
        return num;
    }

    public deleteUserGestures(): number {
        this.unistrokes.length = NumUnistrokes;
        return NumUnistrokes;
    }
}

function optimalCosineDistance(v1: Point[], v2: Point[]) // for Protractor
{
    let a = 0;
    let b = 0;
    for (let i = 0; i < v1.length; i++) {
        let pt1 = v1[i];
        let pt2 = v2[i];
        a += pt1[0] * pt2[0] + pt1[1] * pt2[1];
        b += pt1[0] * pt2[1] - pt1[1] * pt2[0];
    }
    let angle = Math.atan(b / a);
    return Math.acos(a * Math.cos(angle) + b * Math.sin(angle));
}

function distanceAtBestAngle(points: Point[], T, _a, _b, threshold)
{
    let b = _b;
    let a = _a;
    let x1 = Phi * a + (1 - Phi) * b;
    let f1 = distanceAtAngle(points, T, x1);
    let x2 = (1 - Phi) * a + Phi * b;
    let f2 = distanceAtAngle(points, T, x2);
    while (Math.abs(b - a) > threshold)
    {
        if (f1 < f2) {
            b = x2;
            x2 = x1;
            f2 = f1;
            x1 = Phi * a + (1 - Phi) * b;
            f1 = distanceAtAngle(points, T, x1);
        } else {
            a = x1;
            x1 = x2;
            f1 = f2;
            x2 = (1 - Phi) * a + Phi * b;
            f2 = distanceAtAngle(points, T, x2);
        }
    }
    return Math.min(f1, f2);
}

function distanceAtAngle(points: Point[], T, radians)
{
    // let newpoints = rotateBy(points, radians);
    // return pathDistance(newpoints, T.Points);
    return 0;
}
